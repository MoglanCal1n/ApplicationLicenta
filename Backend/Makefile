.PHONY: up build down logs test shell clean

up:
	docker compose up -d

build:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f api

test:
	docker compose exec api python -m pytest tests/ -v

shell:
	docker compose exec api /bin/bash

clean:
	docker compose down -v