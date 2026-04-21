/* eslint-disable */
/**
 * Dashboard.jsx — Platform Orchestrator
 * ──────────────────────────────────────
 * The central hub of Solace. Manages global state (data, modals, navigation)
 * and delegates complex logic to purpose-built hooks.
 *
 * Architecture:
 *   hooks/useOracle.js          ← Oracle sentience + typewriter engine
 *   hooks/useQuantumTether.js   ← WebRTC calling + signaling
 *   utils/crypto.js             ← AES-GCM encryption/decryption
 *   utils/formatters.js         ← Date/time helpers
 */

import React, { useState, useEffect, useRef } from 'react';
import { supabase }              from '../lib/supabase';
import { useAuth }               from '../AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import logo                      from '../assets/logo.png';
import { encryptData, decryptData } from '../utils/crypto';
import { getTimeRemaining, formatTime, formatDateTime } from '../utils/formatters';
import { useOracle }             from '../hooks/useOracle';
import { useQuantumTether }      from '../hooks/useQuantumTether';
import {
  Plus, LogOut, Clock, Unlock,
  MessageSquare, Trash2, Users, Send,
  Shield, User, Layers, Search, X, Check,
  ArrowUpRight, ArrowDownLeft, Phone, Video, PhoneOff, Mic,
  Terminal, ShieldAlert, Cpu, HelpCircle,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();

  // ── Navigation ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('archive');

  // ── Remote Data ────────────────────────────────────────────────────────────
  const [capsules,  setCapsules]  = useState([]);
  const [messages,  setMessages]  = useState([]);
  const [profiles,  setProfiles]  = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [callLogs,  setCallLogs]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  // ── Modal Visibility ───────────────────────────────────────────────────────
  const [showCapsuleModal,  setShowCapsuleModal]  = useState(false);
  const [showProfileModal,  setShowProfileModal]  = useState(false);
  const [showChatModal,     setShowChatModal]     = useState(false);
  const [viewedProfile,     setViewedProfile]     = useState(null);

  // ── Form State ─────────────────────────────────────────────────────────────
  const [newCapsule, setNewCapsule] = useState({ content: '', unlock_at: '', recipient_id: null, is_encrypted: false, passphrase: '' });
  const [file,       setFile]       = useState(null);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [newMsg,     setNewMsg]     = useState('');
  const [editProfile, setEditProfile] = useState({ username: '', bio: '', full_name: '' });

  // ── Decryption State ───────────────────────────────────────────────────────
  const [decryptedContents, setDecryptedContents] = useState({});
  const [decryptionPrompt,  setDecryptionPrompt]  = useState(null);
  const [tempPass,          setTempPass]          = useState('');

  // ── Private DM State ───────────────────────────────────────────────────────
  const [activeChatUser,   setActiveChatUser]   = useState(null);
  const [privateMessages,  setPrivateMessages]  = useState([]);
  const [newPrivMsg,       setNewPrivMsg]       = useState('');

  // ── Realtime / Sync State ─────────────────────────────────────────────────
  const [typingUsers, setTypingUsers] = useState({});
  const [syncRate,    setSyncRate]    = useState(0);
  const [isSyncReady, setIsSyncReady] = useState(false);
  const [now,         setNow]         = useState(new Date());

  // ── Refs ───────────────────────────────────────────────────────────────────
  const lobbyChannel      = useRef(null);
  const chatMessagesRef   = useRef(null);
  const privChatMessagesRef = useRef(null);
  const chatEndRef        = useRef(null);
  const privChatEndRef    = useRef(null);

  // ── Custom Hooks ───────────────────────────────────────────────────────────
  const oracle = useOracle({ profiles, capsules });

  const tether = useQuantumTether({
    user,
    myProfile,
    onCallLog: (targetId, type, status) =>
      supabase.from('call_logs')
        .insert({ caller_id: user.id, receiver_id: targetId, type, status })
        .then(() => fetchCallLogs()),
  });

  // ─── Utilities ────────────────────────────────────────────────────────────
  const scrollToBottom = (ref) => {
    if (ref.current) ref.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const filteredRecipients = profiles.filter(p =>
    p.id !== user.id &&
    (p.username?.toLowerCase().includes(recipientSearch.toLowerCase()) ||
     p.full_name?.toLowerCase().includes(recipientSearch.toLowerCase()))
  );

  // ─── Effects: Global Lobby + Holographic Mouse Tracking ──────────────────
  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setNow(new Date()), 1000);

    // Holographic glass physics — tracks cursor position as CSS variables
    const onMouseMove = (e) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', onMouseMove);

    // Lobby realtime channel
    lobbyChannel.current = supabase.channel('lobby')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => {
        setMessages(prev => [...prev, p.new]);
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        setTypingUsers(prev => ({ ...prev, [payload.id]: Date.now() }));
      })
      .on('broadcast', { event: 'ping' }, () => {})
      .subscribe((status) => {
        setIsSyncReady(status === 'SUBSCRIBED');
      });

    const syncInterval = setInterval(() => {
      if (lobbyChannel.current && isSyncReady) {
        const start = Date.now();
        lobbyChannel.current.httpSend('ping', {}).then(() => setSyncRate(Date.now() - start));
      }
    }, 5000);

    return () => {
      clearInterval(timer);
      clearInterval(syncInterval);
      window.removeEventListener('mousemove', onMouseMove);
      if (lobbyChannel.current) supabase.removeChannel(lobbyChannel.current);
    };
  }, [user]);

  // Effect: Clean up stale typing indicators
  useEffect(() => {
    const cleaner = setInterval(() => {
      setTypingUsers(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          if (Date.now() - next[id] > 3000) { delete next[id]; changed = true; }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(cleaner);
  }, []);

  // Effect: Private chat stream
  useEffect(() => {
    if (!user || !activeChatUser) return;
    const sub = supabase.channel('priv-msgs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, p => {
        if (p.new.sender_id === activeChatUser?.id || p.new.receiver_id === activeChatUser?.id) {
          setPrivateMessages(prev => [...prev, p.new]);
        }
      }).subscribe();
    return () => supabase.removeChannel(sub);
  }, [user, activeChatUser]);

  // Effect: Autoscroll — Lobby
  useEffect(() => {
    const scroll = () => {
      if (chatMessagesRef.current) chatMessagesRef.current.scrollTop = 1e7;
      scrollToBottom(chatEndRef);
    };
    scroll();
    const t1 = setTimeout(scroll, 100);
    const t2 = setTimeout(scroll, 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [messages, activeTab, typingUsers]);

  // Effect: Autoscroll — Private chat
  useEffect(() => {
    const scroll = () => {
      if (privChatMessagesRef.current) privChatMessagesRef.current.scrollTop = 1e7;
      scrollToBottom(privChatEndRef);
    };
    scroll();
    const t1 = setTimeout(scroll, 100);
    const t2 = setTimeout(scroll, 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [privateMessages, showChatModal]);

  // Effect: Autoscroll — Oracle
  useEffect(() => {
    const scroll = () => {
      if (oracle.oracleMessagesRef.current) oracle.oracleMessagesRef.current.scrollTop = 1e7;
      scrollToBottom(oracle.oracleEndRef);
    };
    scroll();
    const t1 = setTimeout(scroll, 100);
    const t2 = setTimeout(scroll, 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [oracle.oracleMessages, activeTab]);

  // ─── Data Fetching ────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchCapsules(), fetchMessages(), fetchProfiles(), fetchMyProfile(), fetchCallLogs()]);
    setLoading(false);
  };

  const fetchMyProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) {
      setMyProfile(data);
      setEditProfile({ username: data.username || '', bio: data.bio || '', full_name: data.full_name || '' });
    }
  };

  const fetchCapsules = async () => {
    const { data } = await supabase
      .from('capsules')
      .select('*, sender:profiles!user_id_link(username), receiver:profiles!recipient_id_link(username)')
      .order('created_at', { ascending: false });
    setCapsules(data || []);
  };

  const fetchMessages = async () => {
    const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true }).limit(50);
    setMessages(data || []);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*');
    setProfiles(data || []);
  };

  const fetchCallLogs = async () => {
    const { data } = await supabase
      .from('call_logs')
      .select('*, caller:profiles!caller_id(username), receiver:profiles!receiver_id(username)')
      .order('created_at', { ascending: false });
    setCallLogs(data || []);
  };

  const fetchPrivateMessages = async (targetId) => {
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    setPrivateMessages(data || []);
  };

  // ─── Actions ──────────────────────────────────────────────────────────────
  const notifyTyping = () => {
    if (lobbyChannel.current && isSyncReady) {
      lobbyChannel.current.httpSend('typing', { id: user.id, username: myProfile?.username });
    }
  };

  const sendMsg = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    const { error } = await supabase.from('messages').insert([{
      user_id: user.id,
      username: myProfile?.username || user.email.split('@')[0],
      content: newMsg,
    }]);
    if (error) alert(error.message);
    setNewMsg('');
  };

  const openPrivateChat = (targetUser) => {
    setActiveChatUser(targetUser);
    fetchPrivateMessages(targetUser.id);
    setShowChatModal(true);
    setViewedProfile(null);
  };

  const sendPrivateMsg = async (e) => {
    e.preventDefault();
    if (!newPrivMsg.trim() || !activeChatUser) return;
    const { error } = await supabase.from('direct_messages').insert([{
      sender_id: user.id, receiver_id: activeChatUser.id, content: newPrivMsg,
    }]);
    if (error) alert(error.message);
    setNewPrivMsg('');
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('profiles').update({ ...editProfile, updated_at: new Date() }).eq('id', user.id);
    if (error) alert(error.message);
    else { setShowProfileModal(false); fetchMyProfile(); fetchProfiles(); }
  };

  const deleteCapsule = async (id) => {
    if (!confirm('Bury this memory forever?')) return;
    const { error } = await supabase.from('capsules').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchCapsules();
  };

  const createCapsule = async (e) => {
    e.preventDefault();
    try {
      let media_url = null, media_type = null, media_name = null;

      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error('File exceeds 5MB limit.');
        const fileName = `${user.id}-${Date.now()}.${file.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('capsules').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('capsules').getPublicUrl(fileName);
        media_url = publicUrl; media_type = file.type; media_name = file.name;
      }

      let content = newCapsule.content;
      let encryption_salt = null;
      if (newCapsule.is_encrypted && newCapsule.passphrase) {
        const enc = await encryptData(content, newCapsule.passphrase);
        content = JSON.stringify({ ciphertext: enc.ciphertext, iv: enc.iv });
        encryption_salt = enc.salt;
      }

      const { error } = await supabase.from('capsules').insert([{
        user_id: user.id, recipient_id: newCapsule.recipient_id,
        content, is_encrypted: newCapsule.is_encrypted, encryption_salt,
        unlock_at: new Date(newCapsule.unlock_at).toISOString(),
        media_url, media_type, media_name,
      }]);
      if (error) throw error;

      setShowCapsuleModal(false);
      setNewCapsule({ content: '', unlock_at: '', recipient_id: null, is_encrypted: false, passphrase: '' });
      setFile(null); setRecipientSearch('');
      fetchCapsules();
    } catch (err) { alert(err.message); }
  };

  const handleDecryption = async (e) => {
    e.preventDefault();
    if (!decryptionPrompt || !tempPass) return;
    try {
      const parsed    = JSON.parse(decryptionPrompt.content);
      const decrypted = await decryptData(parsed.ciphertext, parsed.iv, decryptionPrompt.encryption_salt, tempPass);
      setDecryptedContents(prev => ({ ...prev, [decryptionPrompt.id]: decrypted }));
      setDecryptionPrompt(null); setTempPass('');
    } catch {
      alert('Neural link failed: Incorrect passphrase.');
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-layout">

      {/* ── Background ─────────────────────────────────────────────────────── */}
      <div className="nebula-system">
        <div className="nebula nebula-1" />
        <div className="nebula nebula-2" />
        <div className="nebula nebula-3" />
      </div>

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <nav className="sidebar glass-premium">
        <div className="sidebar-logo">
          <img src={logo} alt="Solace" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <span className="brand-text">Solace</span>
        </div>

        <div className="sidebar-links">
          {[
            { id: 'archive', icon: <Layers size={20} />, label: 'Archive' },
            { id: 'pulse',   icon: <Users   size={20} />, label: 'Pulse'   },
            { id: 'chat',    icon: <MessageSquare size={20} />, label: 'Lobby' },
            { id: 'oracle',  icon: <Cpu     size={20} />, label: 'Oracle'  },
            { id: 'history', icon: <Clock   size={20} />, label: 'History' },
          ].map(({ id, icon, label }) => (
            <button
              key={id}
              className={`nav-item ${activeTab === id ? 'active' : ''}`}
              onClick={() => { setActiveTab(id); if (id === 'history') fetchCallLogs(); }}
            >
              {icon} <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="footer-user-row">
            <button className="user-pill glass" onClick={() => setShowProfileModal(true)}>
              <div className="avatar-small">{myProfile?.username?.[0]?.toUpperCase()}</div>
              <div className="user-details">
                <span className="user-name">{myProfile?.username || 'User'}</span>
                <span className="sync-rate"><Cpu size={10} /> {syncRate}ms Sync</span>
              </div>
            </button>
            <button onClick={() => supabase.auth.signOut()} className="btn-logout" title="Sign Out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main className="content-area glass">
        <AnimatePresence mode="wait">

          {/* Archive */}
          {activeTab === 'archive' && (
            <motion.div key="archive" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="view-header">
                <div>
                  <h1>Memory Archive</h1>
                  <p className="text-secondary">Manage your private and shared time capsules.</p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                    <HelpCircle size={14} /> Ask Oracle for 'guide'
                  </span>
                  <button onClick={() => setShowCapsuleModal(true)} className="btn-primary">
                    <Plus size={20} /> New Capsule
                  </button>
                </div>
              </div>

              <div className="capsule-grid">
                {capsules.map((cap, i) => {
                  const isMine = cap.user_id === user.id;
                  const locked = new Date(cap.unlock_at) > now;
                  return (
                    <motion.div key={cap.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className={`capsule-card glass ${locked ? 'locked' : 'unlocked'}`}>
                      {isMine && <button onClick={() => deleteCapsule(cap.id)} className="btn-delete-float"><Trash2 size={14} /></button>}

                      <div className="capsule-meta">
                        <div className="capsule-badge">{locked ? <Clock size={12} /> : <Unlock size={12} />} {locked ? 'Locked' : 'Unlocked'}</div>
                        <div className={`capsule-type-badge ${isMine ? 'badge-sent' : 'badge-received'}`}>
                          {isMine ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />} {isMine ? 'Sent' : 'Received'}
                        </div>
                      </div>

                      <div className="capsule-body">
                        {locked ? (
                          <div className="locked-state">
                            <span className="shimmer-text">Encrypted Pulse</span>
                            <span className="unlock-timer">{getTimeRemaining(cap.unlock_at)}</span>
                          </div>
                        ) : cap.is_encrypted && !decryptedContents[cap.id] ? (
                          <div className="locked-state">
                            <ShieldAlert size={32} color="var(--accent-primary)" />
                            <p className="text-secondary" style={{ fontSize: 12 }}>This memory is shielded.</p>
                            <button onClick={() => setDecryptionPrompt(cap)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 11 }}>Verify Link</button>
                          </div>
                        ) : (
                          <>
                            <p>{decryptedContents[cap.id] || cap.content}</p>
                            {cap.media_url && cap.media_type?.startsWith('image/') && <img src={cap.media_url} className="capsule-media" alt="Attached" />}
                            {cap.media_url && !cap.media_type?.startsWith('image/') && <a href={cap.media_url} download className="file-download" target="_blank" rel="noreferrer">📎 {cap.media_name}</a>}
                          </>
                        )}
                      </div>

                      <div className="capsule-footer-info">
                        {!isMine && <span>From: {cap.sender?.username || 'System'}</span>}
                        {isMine && cap.recipient_id && <span>To: {cap.receiver?.username || 'Traveler'}</span>}
                        {isMine && !cap.recipient_id && <span>Personal Archive</span>}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Pulse Network */}
          {activeTab === 'pulse' && (
            <motion.div key="pulse" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="view-header">
                <h1>Pulse Network</h1>
                <p className="text-secondary">Travelers currently synchronized with the void.</p>
              </div>
              <div className="profiles-grid">
                {profiles.filter(p => p.id !== user.id).map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="profile-card glass" onClick={() => setViewedProfile(p)}>
                    <div className="profile-top">
                      <div className="profile-avatar">
                        {p.username?.[0].toUpperCase()}
                        <div className="status-indicator status-online" />
                      </div>
                      <h3>{p.username}</h3>
                      <p className="full-name">{p.full_name || 'Anonymous'}</p>
                    </div>
                    <div className="profile-stats">
                      <span className="bio-preview">{p.bio || 'No bio recorded.'}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Global Lobby */}
          {activeTab === 'chat' && (
            <motion.div key="chat" className="chat-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="view-header">
                <h1>Global Lobby</h1>
                <p className="text-secondary">Collective consciousness stream.</p>
              </div>
              <div className="chat-container glass-premium">
                <div className="chat-messages" ref={chatMessagesRef}>
                  {messages.map((m, i) => (
                    <div key={m.id || i} className={`msg-bubble ${m.user_id === user.id ? 'own' : ''}`}>
                      <div className="msg-info">
                        <span>{m.username}</span>
                        <span className="msg-time">{formatTime(m.created_at)}</span>
                      </div>
                      <p className="msg-text">{m.content}</p>
                    </div>
                  ))}
                  {Object.keys(typingUsers).filter(id => id !== user.id).length > 0 && (
                    <div className="typing-indicator shimmer-text">Travelers transmitting to the void...</div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <form className="chat-input" onSubmit={sendMsg}>
                  <input placeholder="Broadcast a pulse..." value={newMsg} onChange={e => { setNewMsg(e.target.value); notifyTyping(); }} />
                  <button type="submit" className="btn-send"><Send size={18} /></button>
                </form>
              </div>
            </motion.div>
          )}

          {/* Oracle Link */}
          {activeTab === 'oracle' && (
            <motion.div key="oracle" className="oracle-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="view-header">
                <h1 className="shimmer-text">Oracle Link</h1>
                <p className="text-secondary">Direct synapse into the guardian's consciousness.</p>
              </div>
              <div className="oracle-container glass-premium">
                <div className="scanline" />
                <div className="oracle-messages scrollable" ref={oracle.oracleMessagesRef}>
                  {oracle.oracleMessages.map((m, i) => (
                    <div key={i} className={`oracle-msg ${m.role === 'oracle' ? 'ai' : 'user'}`}>
                      <div className="oracle-role-badge">
                        {m.role === 'oracle' ? <Terminal size={14} /> : <User size={14} />} {m.role.toUpperCase()}
                      </div>
                      <p>{m.content}</p>
                    </div>
                  ))}
                  {oracle.isOracleLoading && <div className="shimmer-text">Processing synaptic arrays...</div>}
                  <div ref={oracle.oracleEndRef} />
                </div>

                {/* Quick command chips */}
                <div style={{ display: 'flex', gap: 8, padding: '0 24px 12px', flexWrap: 'wrap' }}>
                  {['guide', 'status', 'who are you?'].map(cmd => (
                    <button key={cmd} className="glass"
                      style={{ padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-secondary)', cursor: 'pointer' }}
                      onClick={() => { oracle.setOracleInput(cmd); setTimeout(() => oracle.askOracle({ preventDefault: () => {} }), 10); }}>
                      <Terminal size={10} style={{ marginRight: 5 }} /> {cmd}
                    </button>
                  ))}
                </div>

                <form className="oracle-input chat-input" onSubmit={oracle.askOracle}>
                  <input placeholder="Type 'guide' or click a suggestion..." value={oracle.oracleInput} onChange={e => oracle.setOracleInput(e.target.value)} />
                  <button type="submit" className="btn-send"><Cpu size={18} /></button>
                </form>
              </div>
            </motion.div>
          )}

          {/* Tether History */}
          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="view-header">
                <h1>Tether Logs</h1>
                <p className="text-secondary">Persistent archive of all quantum connections.</p>
              </div>
              <div className="history-list glass-premium scrollable" style={{ padding: 20, maxHeight: '70vh' }}>
                {callLogs.length === 0 ? (
                  <div className="text-secondary" style={{ textAlign: 'center', padding: 40 }}>No connection logs found.</div>
                ) : callLogs.map((log, i) => (
                  <motion.div key={log.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="history-item glass" style={{ marginBottom: 12, padding: 15, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                      <div className={`history-icon ${log.type}`}>
                        {log.type === 'video' ? <Video size={18} /> : <Phone size={18} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {log.caller_id === user.id ? `To: ${log.receiver?.username || 'Unknown'}` : `From: ${log.caller?.username || 'Unknown'}`}
                        </div>
                        <div className="text-secondary" style={{ fontSize: 11 }}>{formatDateTime(log.created_at)}</div>
                      </div>
                    </div>
                    <div className={`status-badge ${log.status}`}>{log.status.toUpperCase()}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ── Modals & Overlays ──────────────────────────────────────────────── */}

      {/* Quantum Tether Call Overlay */}
      <AnimatePresence>
        {tether.callState !== 'idle' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="call-overlay">
            {tether.callState === 'ringing' && (
              <div className="incoming-call glass-premium">
                <h2>Incoming Tether</h2>
                <p>From traveler <strong>{tether.callerInfo?.username}</strong></p>
                <div className="call-actions">
                  <button className="btn-call status-online" onClick={tether.acceptCall}><Check size={28} /></button>
                  <button className="btn-call btn-end"        onClick={tether.rejectCall}><PhoneOff size={28} /></button>
                </div>
              </div>
            )}
            {(tether.callState === 'active' || tether.callState === 'calling') && (
              <div className="active-call">
                <div className="video-container">
                  <div className="video-stream remote">
                    <video ref={tether.remoteVideoRef} autoPlay playsInline
                      style={{ display: tether.isVideoCall ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'cover' }} />
                    {!tether.isVideoCall && tether.callState === 'active' && (
                      <div className="audio-visualizer">
                        <div className="audio-wave" /><div className="audio-wave" /><div className="audio-wave" />
                        <span>Voice Uplink Active</span>
                      </div>
                    )}
                    {tether.callState === 'calling' && (
                      <div className="calling-spinner"><div className="shimmer-text">Establishing Connection...</div></div>
                    )}
                  </div>
                  <div className="video-stream self">
                    <video ref={tether.localVideoRef} autoPlay playsInline muted
                      style={{ display: tether.isVideoCall ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'cover' }} />
                    {!tether.isVideoCall && <div className="audio-visualizer small"><Mic size={32} color="var(--accent-primary)" /></div>}
                  </div>
                </div>
                <div className="call-controls">
                  <button className="btn-call btn-end" onClick={tether.endCall}><PhoneOff size={28} /></button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Private Chat */}
      <AnimatePresence>
        {showChatModal && activeChatUser && (
          <div className="modal-overlay" onClick={() => setShowChatModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="modal glass-premium private-chat-modal" onClick={e => e.stopPropagation()}>
              <div className="chat-header">
                <div className="avatar-small">{activeChatUser.username[0].toUpperCase()}</div>
                <h3>{activeChatUser.username}</h3>
                <button className="btn-text" onClick={() => setShowChatModal(false)}><X size={20} /></button>
              </div>
              <div className="chat-body scrollable" ref={privChatMessagesRef}>
                {privateMessages.map((m, i) => (
                  <div key={m.id || i} className={`msg-bubble ${m.sender_id === user.id ? 'own' : ''}`}>
                    <p className="msg-text">{m.content}</p>
                  </div>
                ))}
                <div ref={privChatEndRef} />
              </div>
              <form className="chat-input" onSubmit={sendPrivateMsg}>
                <input placeholder="Secure transmission..." value={newPrivMsg} onChange={e => setNewPrivMsg(e.target.value)} />
                <button type="submit" className="btn-send"><Send size={18} /></button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Viewer */}
      <AnimatePresence>
        {viewedProfile && (
          <div className="modal-overlay" onClick={() => setViewedProfile(null)}>
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="modal glass profile-viewer" onClick={e => e.stopPropagation()}>
              <div className="viewer-header">
                <div className="profile-avatar large">{viewedProfile.username?.[0].toUpperCase()}</div>
                <h2>{viewedProfile.username}</h2>
                <p className="full-name">{viewedProfile.full_name || 'Traveler'}</p>
              </div>
              <div className="viewer-actions">
                <button className="btn-primary w-full" onClick={() => { setViewedProfile(null); setNewCapsule({ content: '', unlock_at: '', recipient_id: viewedProfile.id }); setRecipientSearch(viewedProfile.username); setShowCapsuleModal(true); }}>
                  <Clock size={18} /> Send Capsule
                </button>
                <button className="btn-secondary w-full" onClick={() => openPrivateChat(viewedProfile)}>
                  <MessageSquare size={18} /> Message
                </button>
                <button className="btn-secondary w-full" onClick={() => tether.startCall(viewedProfile, false)}>
                  <Mic size={18} /> Voice Uplink
                </button>
                <button className="btn-secondary w-full" onClick={() => tether.startCall(viewedProfile, true)}>
                  <Video size={18} /> Quantum Tether
                </button>
              </div>
              <button className="close-btn" onClick={() => setViewedProfile(null)}><X size={20} /></button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Capsule */}
      <AnimatePresence>
        {showCapsuleModal && (
          <div className="modal-overlay" onClick={() => setShowCapsuleModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="modal glass-premium" onClick={e => e.stopPropagation()}>
              <h2>Extract Memory</h2>
              <form onSubmit={createCapsule}>
                <label>Memory Data</label>
                <textarea rows="4" placeholder="What do you want to preserve?" value={newCapsule.content} onChange={e => setNewCapsule({ ...newCapsule, content: e.target.value })} required />

                <label>Attach Artifact (Optional)</label>
                <input type="file" onChange={e => setFile(e.target.files[0])} />

                <label>Unlock Coordinates (Time)</label>
                <input type="datetime-local" value={newCapsule.unlock_at} onChange={e => setNewCapsule({ ...newCapsule, unlock_at: e.target.value })} required />

                <label>Target Frequency (Optional Recipient)</label>
                <div className="recipient-select">
                  <div className="recipient-search-wrap">
                    <Search size={16} />
                    <input className="recipient-search" placeholder="Search traveler..." value={recipientSearch}
                      onChange={e => { setRecipientSearch(e.target.value); setNewCapsule({ ...newCapsule, recipient_id: null }); }} />
                  </div>
                  {recipientSearch && !newCapsule.recipient_id && (
                    <div className="recipient-list">
                      {filteredRecipients.map(p => (
                        <div key={p.id} className="recipient-item" onClick={() => { setNewCapsule({ ...newCapsule, recipient_id: p.id }); setRecipientSearch(p.username); }}>
                          <div className="avatar-tiny">{p.username?.[0].toUpperCase()}</div>
                          <span>{p.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {newCapsule.recipient_id && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--accent-secondary)' }}>✓ Target locked: {recipientSearch}</div>}
                </div>

                <div className="encryption-options glass" style={{ padding: 15, borderRadius: 12, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: newCapsule.is_encrypted ? 15 : 0 }}>
                    <label style={{ margin: 0 }}>Void Vault Encryption</label>
                    <input type="checkbox" checked={newCapsule.is_encrypted} onChange={e => setNewCapsule({ ...newCapsule, is_encrypted: e.target.checked })} style={{ width: 20, height: 20, margin: 0 }} />
                  </div>
                  {newCapsule.is_encrypted && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
                      <label>Synaptic Passphrase</label>
                      <input type="password" placeholder="Enter security key..." value={newCapsule.passphrase} onChange={e => setNewCapsule({ ...newCapsule, passphrase: e.target.value })} />
                      <p style={{ fontSize: 10, color: '#ef4444', fontStyle: 'italic' }}>Warning: If forgotten, the memory is lost to the void forever.</p>
                    </motion.div>
                  )}
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-text" onClick={() => setShowCapsuleModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary"><Plus size={18} /> Seal Capsule</button>
                </div>
              </form>
              <button className="close-btn" onClick={() => setShowCapsuleModal(false)}><X size={20} /></button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Profile */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="modal glass-premium" onClick={e => e.stopPropagation()}>
              <h2>Synchronize Identity</h2>
              <form onSubmit={updateProfile}>
                <label>Traveler Alias</label>
                <input type="text" placeholder="Username" value={editProfile.username} onChange={e => setEditProfile({ ...editProfile, username: e.target.value })} />
                <label>Full Designation</label>
                <input type="text" placeholder="Full Name"  value={editProfile.full_name} onChange={e => setEditProfile({ ...editProfile, full_name: e.target.value })} />
                <label>Bio-Signature</label>
                <textarea rows="3" placeholder="Who are you?" value={editProfile.bio} onChange={e => setEditProfile({ ...editProfile, bio: e.target.value })} />
                <div className="modal-actions">
                  <button type="button" className="btn-text" onClick={() => setShowProfileModal(false)}>Abort</button>
                  <button type="submit" className="btn-primary"><Check size={18} /> Sync</button>
                </div>
              </form>
              <button className="close-btn" onClick={() => setShowProfileModal(false)}><X size={20} /></button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Decryption Ritual */}
      <AnimatePresence>
        {decryptionPrompt && (
          <div className="modal-overlay" onClick={() => setDecryptionPrompt(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="modal glass-premium" onClick={e => e.stopPropagation()}>
              <h2>Decryption Ritual</h2>
              <p className="text-secondary" style={{ marginBottom: 24 }}>Input the synaptic passphrase for this encrypted pulse.</p>
              <form onSubmit={handleDecryption}>
                <label>Passphrase</label>
                <input type="password" placeholder="The key to the void..." value={tempPass} onChange={e => setTempPass(e.target.value)} required />
                <div className="modal-actions">
                  <button type="button" className="btn-text" onClick={() => setDecryptionPrompt(null)}>Abort</button>
                  <button type="submit" className="btn-primary"><Shield size={18} /> De-shimmer</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Dashboard;
