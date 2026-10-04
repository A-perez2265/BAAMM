import React, { useState } from 'react';

export default function ActivityFeed() {
  const [notifications, setNotifications] = useState([
    {
      id: 101,
      category: "Credit Log",
      message: "You earned 2.0 credits from teaching SQL Database Setup.",
      timestamp: "10m ago",
      route: "/exchanges/3"
    },
    {
      id: 102,
      category: "Request Status",
      message: "Sarah accepted your request for UI/UX Design.",
      timestamp: "1h ago",
      route: "/exchanges/2"
    },
    {
      id: 103,
      category: "Review Alert",
      message: "Alex left a 5-star review for your Python lesson!",
      timestamp: "1d ago",
      route: "/profile/alex"
    }
  ]);

  return (
    <section style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Activity Feed</h3>
        {notifications.length > 0 && (
          <button
            onClick={() => setNotifications([])}
            style={{ background: 'none', border: 'none', color: '#803b4e', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
          >
            Clear All
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', border: '2px dashed #e2e8f0', borderRadius: '12px', color: '#94a3b8' }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>No active notifications</p>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px' }}>Your feed is up to date!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notifications.map((n) => (
            <div key={n.id} style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>
                <span style={{ color: '#0284c7' }}>{n.category}</span>
                <span style={{ color: '#94a3b8', fontWeight: '400' }}>{n.timestamp}</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.4' }}>{n.message}</p>
              <button
                onClick={() => alert(`Navigating to route: ${n.route}`)}
                style={{ background: 'none', border: 'none', color: '#803b4e', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: 0, marginTop: '6px' }}
              >
                View details →
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}