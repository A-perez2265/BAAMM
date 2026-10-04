import React, { useState } from 'react';
import ActivityFeed from '../components/ActivityFeed';
import Alerts from '../components/Alerts';

export default function DashboardPage() {
  const [user] = useState({
    name: "User 101",
    username: "@user101",
    creditBalance: 12.5,
    earnedCredits: 20.0,
    spentCredits: 7.5
  });

  const [exchanges] = useState([
    { id: 1, title: "Python Basics", role: "Teacher", partner: "Alex", status: "Pending", category: "Programming" },
    { id: 2, title: "UI/UX Design", role: "Learner", partner: "Sarah", status: "Accepted", category: "Art & Design" },
    { id: 3, title: "SQL Database Setup", role: "Teacher", partner: "Dave", status: "Completed", category: "Database" }
  ]);

  return (
    <div style={{ backgroundColor: '#f4f5f8', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b', textAlign: 'left' }}>
      
      {/* Top Navigation Bar */}
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        {/* Logo Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>⚡</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px', color: '#000000' }}>SKILL SWAP</h1>
            <p style={{ margin: 0, fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>LEARN • SHARE • GROW</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '6px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
          {['Dashboard', 'Search', 'Request', 'Incoming', 'Confirm', 'My Skills'].map((tab) => (
            <button
              key={tab}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                backgroundColor: tab === 'Dashboard' ? '#fde8ef' : 'transparent',
                color: tab === 'Dashboard' ? '#803b4e' : '#64748b'
              }}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Auth status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
          <span style={{ color: '#64748b' }}>Signed in as <strong style={{ color: '#000000' }}>{user.name}</strong> <span style={{ color: '#94a3b8' }}>{user.username}</span></span>
          <button style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: '#475569' }}>Sign Out</button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px' }}>
        
        {/* Header Hero Banner */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            {/* Explicitly set color to pure black */}
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#000000' }}>
              Welcome back, {user.name}! 👋
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
              Track your active skill exchanges and credit breakdown
            </p>
          </div>

          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '12px 24px',
            borderRadius: '12px',
            textAlign: 'right'
          }}>
            <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>
              Available Balance
            </span>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#803b4e', marginTop: '2px' }}>
              {user.creditBalance} <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>Hours</span>
            </div>
          </div>
        </div>

        {/* Two-Column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Active Exchanges Section */}
            <section style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#000000' }}>Active Exchanges</h3>
                <span style={{ fontSize: '12px', backgroundColor: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
                  {exchanges.length} Total
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {exchanges.map((ex) => (
                  <div key={ex.id} style={{
                    padding: '16px',
                    border: '1px solid #f1f5f9',
                    borderRadius: '12px',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    textAlign: 'left'
                  }}>
                    {/* Left text alignment container */}
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{ex.category}</span>
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: '600',
                          backgroundColor: ex.role === 'Teacher' ? '#fde8ef' : '#e0f2fe',
                          color: ex.role === 'Teacher' ? '#803b4e' : '#0369a1'
                        }}>
                          {ex.role}
                        </span>
                      </div>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#000000', textAlign: 'left' }}>{ex.title}</h4>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', textAlign: 'left' }}>Partner: <strong>{ex.partner}</strong></p>
                    </div>

                    {/* Status badge aligned right */}
                    <span style={{
                      fontSize: '12px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontWeight: '700',
                      backgroundColor: ex.status === 'Pending' ? '#fef3c7' : ex.status === 'Accepted' ? '#dbeafe' : '#dcfce7',
                      color: ex.status === 'Pending' ? '#b45309' : ex.status === 'Accepted' ? '#1d4ed8' : '#15803d',
                      whiteSpace: 'nowrap'
                    }}>
                      {ex.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Credit Breakdown Section */}
            <section style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#000000' }}>Credit Ledger Breakdown</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#15803d', textTransform: 'uppercase', fontWeight: '700' }}>Earned (Teaching)</span>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>+{user.earnedCredits} hrs</div>
                </div>
                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#b91c1c', textTransform: 'uppercase', fontWeight: '700' }}>Spent (Learning)</span>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#dc2626', marginTop: '4px' }}>-{user.spentCredits} hrs</div>
                </div>
              </div>
            </section>

          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Alerts />
            <ActivityFeed />
          </div>

        </div>
      </main>
    </div>
  );
}