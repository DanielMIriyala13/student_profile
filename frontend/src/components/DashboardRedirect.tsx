import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

export const DashboardRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    switch (user.role) {
      case 'STUDENT':
        navigate('/student/dashboard', { replace: true });
        break;
      case 'FACULTY':
        navigate('/faculty/dashboard', { replace: true });
        break;
      case 'HOD':
        navigate('/hod/dashboard', { replace: true });
        break;
      case 'PLACEMENT_OFFICER':
        navigate('/placement/dashboard', { replace: true });
        break;
      case 'ADMIN':
        navigate('/institution/dashboard', { replace: true });
        break;
      default:
        navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-muted-foreground animate-pulse text-sm font-medium">Navigating to Dashboard...</p>
      </div>
    </div>
  );
};

export default DashboardRedirect;
