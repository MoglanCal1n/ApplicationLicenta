import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import DoctorDashboard from './DoctorDashboard';
import PatientDashboard from './PatientDashboard';
import AdminDashboard from './AdminDashboard';
import { Navigate } from 'react-router-dom';
import { PageLoader } from '../components/ui';

export default function Dashboard() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) return <Navigate to="/login" />;

  return (
    <div>
      {user.role === 'DOCTOR' ? (
        <DoctorDashboard />
      ) : user.role === 'ADMIN' ? (
        <AdminDashboard />
      ) : (
        <PatientDashboard />
      )}
    </div>
  );
}
