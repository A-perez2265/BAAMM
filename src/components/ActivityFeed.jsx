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
    <section style={{ padding: '16px', border: '1px solid #333', borderRadius: '8px', backgroundColor: '#1a1a1a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>Activity Feed</h2>
        {notifications.length > 0 && (
          <button 
            onClick={() => setNotifications([])} 
            style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Clear Feed
          </button>
        )}
      </div>

      {/* REQ-5.4.6: Empty State */}
      {notifications.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed #444', borderRadius: '6px', color: '#888', backgroundColor: '#262626' }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>No active notifications</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>Your feed is clean!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notifications.map((n) => (
            <div key={n.id} style={{ padding: '10px', border: '1px solid #333', borderRadius: '6px', backgroundColor: '#262626' }}>
              {/* REQ-5.4.4 Category Indicator */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                <span style={{ color: '#60a5fa', textTransform: 'uppercase' }}>[{n.category}]</span>
                <span style={{ color: '#888' }}>{n.timestamp}</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#ddd' }}>{n.message}</p>
              {/* REQ-5.4.6 Navigation Action */}
              <button 
                onClick={() => alert(`Navigating to route: ${n.route}`)}
                style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', padding: 0, marginTop: '6px' }}
              >
                View Route
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}