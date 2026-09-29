import React, { useState } from 'react';
import ActivityFeed from '../components/ActivityFeed';
import Alerts from '../components/Alerts';

export default function DashboardPage() {
  const [user] = useState({
    name: "User 101",
    creditBalance: 12.5,
    earnedCredits: 20.0,
    spentCredits: 7.5
  });

  const [exchanges] = useState([
    { id: 1, title: "Python Basics", role: "Teacher", partner: "Alex", status: "Pending" },
    { id: 2, title: "UI/UX Design", role: "Learner", partner: "Sarah", status: "Accepted" },
    { id: 3, title: "SQL Database Setup", role: "Teacher", partner: "Dave", status: "Completed" }
  ]);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', textAlign: 'left' }}>
      
      {/* REQ-5.4.1: Credit & Navigation Header */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px', 
        border: '1px solid #333', 
        borderRadius: '8px', 
        marginBottom: '20px',
        backgroundColor: '#1a1a1a'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px' }}>Welcome, {user.name}</h1>
          <p style={{ margin: '4px 0 0 0', color: '#aaa', fontSize: '14px' }}>SkillSwap Dashboard</p>
        </div>

        <div style={{ padding: '8px 16px', border: '1px solid #444', borderRadius: '6px', textAlign: 'center', backgroundColor: '#262626' }}>
          <span style={{ fontSize: '11px', display: 'block', color: '#aaa', textTransform: 'uppercase', fontWeight: 'bold' }}>
            Available Credit Balance
          </span>
          <strong style={{ fontSize: '20px', color: '#60a5fa' }}>{user.creditBalance} Hours</strong>
        </div>

        <nav style={{ display: 'flex', gap: '8px' }}>
          <button style={{ padding: '6px 12px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #444', background: '#333', color: '#fff' }}>Search</button>
          <button style={{ padding: '6px 12px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #444', background: '#333', color: '#fff' }}>Profile</button>
          <button style={{ padding: '6px 12px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #444', background: '#333', color: '#fff' }}>Settings</button>
        </nav>
      </header>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* REQ-5.4.2: Active Exchange Overview */}
          <section style={{ padding: '16px', border: '1px solid #333', borderRadius: '8px', backgroundColor: '#1a1a1a' }}>
            <h2 style={{ marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '8px', fontSize: '18px' }}>Active Exchanges</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {exchanges.map((ex) => (
                <div key={ex.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '10px', 
                  border: '1px solid #333', 
                  borderRadius: '6px',
                  backgroundColor: '#262626'
                }}>
                  <div>
                    <strong style={{ fontSize: '15px' }}>{ex.title}</strong>
                    <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>Role: {ex.role} | Partner: {ex.partner}</div>
                  </div>
                  <span style={{ 
                    fontSize: '12px', 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontWeight: 'bold',
                    backgroundColor: ex.status === 'Pending' ? '#854d0e' : ex.status === 'Accepted' ? '#1e40af' : '#166534',
                    color: '#fff'
                  }}>
                    {ex.status}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* REQ-5.4.5: Transaction Ledger Tracking */}
          <section style={{ padding: '16px', border: '1px solid #333', borderRadius: '8px', backgroundColor: '#1a1a1a' }}>
            <h2 style={{ marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '8px', fontSize: '18px' }}>Credit Ledger Breakdown</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', textAlign: 'center' }}>
              <div style={{ padding: '12px', border: '1px solid #166534', borderRadius: '6px', backgroundColor: '#062c13' }}>
                <span style={{ fontSize: '11px', color: '#4ade80', display: 'block', textTransform: 'uppercase', fontWeight: 'bold' }}>Earned (Teaching)</span>
                <strong style={{ fontSize: '20px', color: '#4ade80' }}>+{user.earnedCredits} hrs</strong>
              </div>
              <div style={{ padding: '12px', border: '1px solid #991b1b', borderRadius: '6px', backgroundColor: '#360c0c' }}>
                <span style={{ fontSize: '11px', color: '#f87171', display: 'block', textTransform: 'uppercase', fontWeight: 'bold' }}>Spent (Learning)</span>
                <strong style={{ fontSize: '20px', color: '#f87171' }}>-{user.spentCredits} hrs</strong>
              </div>
            </div>
          </section>

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Alerts />
          <ActivityFeed />
        </div>

      </div>
    </div>
  );
}