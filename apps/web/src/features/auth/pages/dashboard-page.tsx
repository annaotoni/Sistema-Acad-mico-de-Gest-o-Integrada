import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as authApi from '@/features/auth/api';
import { useAuthStore } from '@/lib/auth-store';
import { SagiApp } from '@/features/dashboard/sagi-app';

export function DashboardPage() {
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((state) => state.setAccessToken);

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      setAccessToken(null);
      void navigate('/login');
    },
  });

  return <SagiApp onLogout={() => logoutMutation.mutate()} />;
}
