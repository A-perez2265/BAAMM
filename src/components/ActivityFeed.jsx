import { Link } from 'react-router-dom'

export default function ActivityFeed({ items = [] }) {
  return (
    <section
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700 }}>
        Activity Feed
      </h3>

      {items.length === 0 ? (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            border: '2px dashed #e2e8f0',
            borderRadius: '12px',
            color: '#94a3b8',
          }}
        >
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
            No active notifications
          </p>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px' }}>
            Incoming requests and confirms will show here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                padding: '12px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #f1f5f9',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#0284c7',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                {item.category}
              </span>
              <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.4 }}>
                {item.message}
              </p>
              <Link
                to={item.to}
                style={{
                  display: 'inline-block',
                  marginTop: '6px',
                  color: '#803b4e',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                View details →
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
