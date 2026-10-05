import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import ActivityFeed from '../components/ActivityFeed';
import Alerts from '../components/Alerts';
import logoImg from '../assets/skillswap-logo-sans.png'; // 👈 Import your SkillSwap logo

export default function DashboardPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState({
    name: "Loading...",
    username: "",
    creditBalance: 0,
    earnedCredits: 0,
    spentCredits: 0
  });

  const [exchanges, setExchanges] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [teacherListings, setTeacherListings] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);

      // 1. Get current authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) return;

      const userId = authUser.id;

      // 2. Fetch User Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username, credits_balance')
        .eq('id', userId)
        .single();

      if (profile) {
        setCurrentUser({
          name: profile.display_name || "User",
          username: profile.username ? `@${profile.username}` : "",
          creditBalance: Math.round(profile.credits_balance || 0),
          earnedCredits: 0, // Calculated from completed teacher exchanges
          spentCredits: 0   // Calculated from completed learner exchanges
        });
      }

      // 3. Fetch Incoming Requests (Exchanges with status 'pending' where user is teacher)
      const { data: reqData } = await supabase
        .from('exchanges')
        .select(`
          id,
          proposal_message,
          skills ( title, format ),
          learner:profiles!exchanges_learner_id_fkey ( display_name )
        `)
        .eq('teacher_id', userId)
        .eq('status', 'pending');

      if (reqData) {
        setIncomingRequests(
          reqData.map((item) => ({
            id: item.id,
            skill: item.skills?.title || "Skill Exchange",
            requester: item.learner?.display_name || "Community Member",
            credits: 1,
            type: item.skills?.format || "In Person"
          }))
        );
      }

      // 4. Fetch Active Exchanges
      const { data: exData } = await supabase
        .from('exchanges')
        .select(`
          id,
          status,
          teacher_id,
          learner_id,
          skills ( title, category ),
          teacher:profiles!exchanges_teacher_id_fkey ( display_name ),
          learner:profiles!exchanges_learner_id_fkey ( display_name )
        `)
        .or(`teacher_id.eq.${userId},learner_id.eq.${userId}`)
        .limit(10);

      if (exData) {
        setExchanges(
          exData.map((ex) => {
            const isTeacher = ex.teacher_id === userId;
            return {
              id: ex.id,
              title: ex.skills?.title || "Skill Exchange",
              role: isTeacher ? "Teacher" : "Learner",
              partner: isTeacher ? ex.learner?.display_name : ex.teacher?.display_name,
              status: ex.status ? ex.status.charAt(0).toUpperCase() + ex.status.slice(1) : "Pending",
              category: ex.skills?.category || "General"
            };
          })
        );
      }

      // 5. Fetch Posted Teacher Skill Listings
      const { data: skillData } = await supabase
        .from('skills')
        .select(`
          id,
          title,
          category,
          experience_level,
          format,
          location,
          profiles ( display_name, username )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (skillData) {
        setTeacherListings(
          skillData.map((s) => ({
            id: s.id,
            title: s.title,
            teacher: s.profiles?.display_name || "Instructor",
            credits: 1,
            category: s.category || "General",
            level: s.experience_level || "Intermediate",
            mode: s.format || "Online",
            location: s.location || "Remote"
          }))
        );
      }

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Action: Accept Request
  const handleAcceptRequest = async (id) => {
    const { error } = await supabase
      .from('exchanges')
      .update({ status: 'accepted' })
      .eq('id', id);

    if (!error) {
      setIncomingRequests((prev) => prev.filter((r) => r.id !== id));
      fetchDashboardData();
    }
  };

  // Action: Decline Request
  const handleDeclineRequest = async (id) => {
    const { error } = await supabase
      .from('exchanges')
      .update({ status: 'declined' })
      .eq('id', id);

    if (!error) {
      setIncomingRequests((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div style={{ backgroundColor: '#f4f5f8', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b', textAlign: 'left' }}>
      
      {/* Top Navigation Bar */}
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '10px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        {/* Logo Section */}
        <div 
          onClick={() => navigate('/')} 
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        >
          <img 
            src={logoImg} 
            alt="SkillSwap Logo" 
            style={{ height: '42px', width: 'auto', objectFit: 'contain' }} 
          />
        </div>

        {/* Cross-Team Route Navigation */}
        <nav style={{ display: 'flex', gap: '6px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
          {[
            { label: 'Dashboard', path: '/' },
            { label: 'Search', path: '/search' },
            { label: 'Request', path: '/request' },
            { label: 'Incoming', path: '/incoming' },
            { label: 'Confirm', path: '/confirm' },
            { label: 'My Skills', path: '/skills' }
          ].map((tab) => (
            <button
              key={tab.label}
              onClick={() => navigate(tab.path)}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                backgroundColor: tab.label === 'Dashboard' ? '#fde8ef' : 'transparent',
                color: tab.label === 'Dashboard' ? '#803b4e' : '#64748b'
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
          <span style={{ color: '#64748b' }}>Signed in as <strong style={{ color: '#000000' }}>{currentUser.name}</strong> <span style={{ color: '#94a3b8' }}>{currentUser.username}</span></span>
          <button onClick={handleSignOut} style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: '#475569' }}>Sign Out</button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px' }}>
        
        {/* Welcome Header */}
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
              Welcome back, {currentUser.name}! 👋
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
              {currentUser.creditBalance} <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>Credits</span>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Incoming Requests */}
            <section style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#000000' }}>Incoming Requests</h3>
                <span style={{ fontSize: '12px', backgroundColor: '#fde8ef', color: '#803b4e', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
                  {incomingRequests.length} Pending
                </span>
              </div>

              {incomingRequests.length === 0 ? (
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>No pending requests right now.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {incomingRequests.map((req) => (
                    <div key={req.id} style={{ padding: '16px', border: '1px solid #f1f5f9', borderRadius: '12px', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#000000' }}>{req.skill}</h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>Requested by <strong>{req.requester}</strong> • {req.credits} Credit ({req.type})</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleAcceptRequest(req.id)} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Accept</button>
                        <button onClick={() => handleDeclineRequest(req.id)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Active Exchanges */}
            <section style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#000000' }}>Active Exchanges</h3>
                <span style={{ fontSize: '12px', backgroundColor: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
                  {exchanges.length} Total
                </span>
              </div>

              {exchanges.length === 0 ? (
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>No active exchanges currently.</p>
              ) : (
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
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}>
                      <div>
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
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#000000' }}>{ex.title}</h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Partner: <strong>{ex.partner}</strong></p>
                      </div>

                      <span style={{
                        fontSize: '12px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontWeight: '700',
                        backgroundColor: ex.status === 'Pending' ? '#fef3c7' : ex.status === 'Accepted' ? '#dbeafe' : '#dcfce7',
                        color: ex.status === 'Pending' ? '#b45309' : ex.status === 'Accepted' ? '#1d4ed8' : '#15803d'
                      }}>
                        {ex.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Teacher Listings Feed */}
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
                        {listing.credits} Credit
                      </span>
                    </div>
                    <button onClick={() => navigate('/request')} style={{ marginTop: '10px', backgroundColor: '#803b4e', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
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
                  <span style={{ fontSize: '16px', fontWeight: '800', color: '#16a34a' }}>+{currentUser.earnedCredits} credits</span>
                </div>
                <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#b91c1c', textTransform: 'uppercase', fontWeight: '700' }}>Spent (Learning)</span>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: '#dc2626' }}>-{currentUser.spentCredits} credits</span>
                </div>
              </div>
            </section>
          </div>

        </div>
      </main>
    </div>
  );
}