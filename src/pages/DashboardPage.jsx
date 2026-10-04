import React, { useState } from 'react';
import ActivityFeed from '../components/ActivityFeed';
import Alerts from '../components/Alerts';

export default function DashboardPage() {
  const [user] = useState({
    name: "User 101",
    username: "@user101",
    creditBalance: 12,
    earnedCredits: 20,
    spentCredits: 8
  });

  const [exchanges] = useState([
    { id: 1, title: "Python Basics", role: "Teacher", partner: "Alex", status: "Pending", category: "Programming" },
    { id: 2, title: "UI/UX Design", role: "Learner", partner: "Sarah", status: "Accepted", category: "Art & Design" },
    { id: 3, title: "SQL Database Setup", role: "Teacher", partner: "Dave", status: "Completed", category: "Database" }
  ]);

  // Teammate's Exchange Engine Data: Incoming Requests
  const [incomingRequests] = useState([
    { id: 201, skill: "Python Basics", requester: "Jordan M.", credits: 1, type: "In Person" }
  ]);

  // Teammate's Exchange Engine Data: Featured Teacher Listings
  const [teacherListings] = useState([
    { id: 301, title: "Mixed Martial Arts", teacher: "AugustineP", credits: 1, category: "Fitness & Wellness", level: "Advanced", mode: "In Person", location: "San Antonio, TX" },
    { id: 302, title: "Programmer Tutoring", teacher: "AugustineP", credits: 1, category: "Technology", level: "Intermediate", mode: "Online", location: "San Antonio, TX" }
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>⚡</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px', color: '#000000' }}>SKILL SWAP</h1>
            <p style={{ margin: 0, fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>LEARN • SHARE • GROW</p>
          </div>
        </div>

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
          <span style={{ color: '#64748b' }}>Signed in as <strong style={{ color: '#000000' }}>{user.name}</strong> <span style={{ color: '#94a3b8' }}>{user.username}</span></span>
          <button style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: '#475569' }}>Sign Out</button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px' }}>
        
        {/* Hero Header */}
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
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#000000' }}>
              Welcome back, {user.name}! 👋
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
              Track your active skill exchanges, incoming requests, and credit breakdown
            </p>
          </div>

          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '12px 24px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px', display: 'block' }}>
              Available Balance
            </span>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#803b4e', marginTop: '2px' }}>
              {Math.round(user.creditBalance)} <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>Credits</span>
            </div>
          </div>
        </div>

        {/* Two-Column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Incoming Requests Widget */}
            <section style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#000000' }}>Incoming Requests</h3>
                <span style={{ fontSize: '12px', backgroundColor: '#fde8ef', color: '#803b4e', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
                  {incomingRequests.length} Pending
                </span>
              </div>

              {incomingRequests.length === 0 ? (
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Accept or decline pending requests for your teacher listings. No pending requests right now.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {incomingRequests.map((req) => (
                    <div key={req.id} style={{ padding: '16px', border: '1px solid #f1f5f9', borderRadius: '12px', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#000000' }}>{req.skill}</h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>Requested by <strong>{req.requester}</strong> • {Math.round(req.credits)} Credit ({req.type})</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Accept</button>
                        <button style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

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

            {/* Teacher Listings Widget */}
            <section style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#000000' }}>Teacher Listings Feed</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>Scroll posted teacher skills and request the one you want to learn</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {teacherListings.map((listing) => (
                  <div key={listing.id} style={{ padding: '16px', border: '1px solid #f1f5f9', borderRadius: '12px', backgroundColor: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#000000' }}>{listing.title}</h4>
                        <p style={{ margin: '4px 0', fontSize: '12px', color: '#64748b' }}>{listing.category} • {listing.level} • {listing.mode} • {listing.location}</p>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#803b4e', backgroundColor: '#fde8ef', padding: '4px 8px', borderRadius: '6px' }}>
                        {Math.round(listing.credits)} Credit
                      </span>
                    </div>
                    <button style={{ marginTop: '10px', backgroundColor: '#803b4e', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                      Request Exchange
                    </button>
                  </div>
                ))}
              </div>
            </section>

          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Alerts />
            <ActivityFeed />

            {/* Credit Ledger Breakdown */}
            <section style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#000000' }}>Credit Ledger Breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#15803d', textTransform: 'uppercase', fontWeight: '700' }}>Earned (Teaching)</span>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: '#16a34a' }}>+{Math.round(user.earnedCredits)} credits</span>
                </div>
                <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#b91c1c', textTransform: 'uppercase', fontWeight: '700' }}>Spent (Learning)</span>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: '#dc2626' }}>-{Math.round(user.spentCredits)} credits</span>
                </div>
              </div>
            </section>
          </div>

        </div>
      </main>
    </div>
  );
}