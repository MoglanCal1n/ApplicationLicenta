"""
Notification Router — REST endpoints + WebSocket for real-time notification delivery.

REST:
  GET  /notifications           — list my notifications (paginated, unread first)
  GET  /notifications/unread-count — returns {"count": N}
  PUT  /notifications/{id}/read — mark single notification as read
  PUT  /notifications/read-all  — mark all as read

WebSocket:
  WS   /notifications/ws?token=<jwt> — real-time push channel
"""

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from jose import jwt, JWTError
import math

from db.database import get_db, SessionLocal
from models.user import User
from models.notification import Notification
from core.security import get_current_user, SECRET_KEY, ALGORITHM
from services.ws_manager import ws_manager

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ── REST Endpoints ────────────────────────────────────────────────────────────

@router.get("")
def get_my_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's notifications, unread first, then by date."""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    total = query.count()
    skip = (page - 1) * limit

    items = query.order_by(
        Notification.is_read.asc(),  # unread first
        Notification.created_at.desc()
    ).offset(skip).limit(limit).all()

    return {
        "items": [
            {
                "id": n.id,
                "type": n.type,
                "title": n.title,
                "message": n.message,
                "is_read": n.is_read,
                "metadata": n.metadata_json,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in items
        ],
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if total > 0 else 0,
    }


@router.get("/unread-count")
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    return {"count": count}


@router.put("/read-all")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read."}


@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read."}


@router.delete("/clear-all")
def clear_all_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete all notifications for the current user."""
    db.query(Notification).filter(Notification.user_id == current_user.id).delete()
    db.commit()
    return {"message": "All notifications deleted."}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a single notification."""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")
    db.delete(notif)
    db.commit()
    return {"message": "Notification deleted."}


# ── WebSocket Endpoint ────────────────────────────────────────────────────────

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(None)):
    """
    WebSocket endpoint for real-time notification push.
    Authenticated via JWT token passed as query parameter or via cookies.
    """
    import logging
    logger = logging.getLogger(__name__)

    # Try query param first, then look in cookies
    token = token or websocket.cookies.get("access_token")
    if not token:
        logger.warning("[WS] No auth token found in query params or cookies.")
        await websocket.accept()
        await websocket.close(code=4001)
        return

    # Validate token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            logger.warning("[WS] Token has no 'sub' claim.")
            await websocket.accept()
            await websocket.close(code=4001)
            return
    except JWTError as e:
        logger.warning(f"[WS] JWT decode error: {e}")
        await websocket.accept()
        await websocket.close(code=4001)
        return

    # Look up user
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            logger.warning(f"[WS] No user found for email {email}")
            await websocket.accept()
            await websocket.close(code=4001)
            return
        user_id = user.id
    finally:
        db.close()

    # Connect and keep alive
    logger.info(f"[WS] Authenticated user {user_id} ({email}), accepting connection.")
    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            # Keep connection alive by reading (client can send pings)
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id, websocket)
    except Exception:
        ws_manager.disconnect(user_id, websocket)


# ── Helper: create + push notification (used by other routers) ────────────────

async def create_and_push_notification(
    db: Session,
    user_id: int,
    notification_type: str,
    title: str,
    message: str,
    metadata: dict | None = None,
):
    """Creates a notification in the DB and pushes it via WebSocket."""
    notif = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        metadata_json=metadata,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    # Push via WebSocket
    await ws_manager.send_to_user(user_id, {
        "type": "notification",
        "data": {
            "id": notif.id,
            "type": notif.type,
            "title": notif.title,
            "message": notif.message,
            "is_read": False,
            "metadata": notif.metadata_json,
            "created_at": notif.created_at.isoformat() if notif.created_at else None,
        }
    })

    return notif
