import useAuthStore from '../store/auth.store';
import DashboardProductor from './DashboardProductor';
import DashboardComprador from './DashboardComprador';
import DashboardAsociacion from './DashboardAsociacion';

export default function Dashboard() {
  const { user } = useAuthStore();

  if (user?.rol === 'asociacion') return <DashboardAsociacion />;
  if (user?.rol === 'productor') return <DashboardProductor />;
  return <DashboardComprador />;
}
