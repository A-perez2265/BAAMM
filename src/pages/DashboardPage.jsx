import ActivityFeed from '../components/ActivityFeed';
import Alerts from '../components/Alerts';

export default function DashboardPage() {
  return (
    <div className="dashboard-page">
      <h2>Dashboard</h2>
      <Alerts />
      <ActivityFeed />
    </div>
  );
}