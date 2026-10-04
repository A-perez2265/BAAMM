import React from 'react';

export default function Alerts() {
  return (
    <section style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700' }}>Alerts</h3>
      <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', fontSize: '13px', color: '#64748b' }}>
        No urgent alerts right now.
      </div>
    </section>
  );
}