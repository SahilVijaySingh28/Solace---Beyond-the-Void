import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, UserPlus, LogIn, ArrowRight } from 'lucide-react';

import logo from '../assets/logo.png';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState({ type: '', content: '' });

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', content: '' });

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;
        setMessage({ type: 'success', content: 'Verification email sent! Check your inbox.' });
      }
    } catch (error) {
      setMessage({ type: 'error', content: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="auth-card glass"
      >
        <div className="auth-header">
          <div className="logo-icon" style={{ background: 'none', border: 'none' }}>
            <img src={logo} alt="Solace Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1>{isLogin ? 'Welcome Back' : <>Join <span className="brand-text">Solace</span></>}</h1>
          <p className="text-secondary">
            {isLogin ? 'Your memories are waiting for their time.' : 'Start your digital legacy today.'}
          </p>
        </div>

        <form onSubmit={handleAuth}>
          <div className="input-group">
            <Mail className="input-icon" size={18} />
            <input 
              type="email" 
              placeholder="Email address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div className="input-group">
            <Lock className="input-icon" size={18} />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className="btn-primary glow-hover" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <AnimatePresence>
          {message.content && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`auth-message ${message.type}`}
            >
              {message.content}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="auth-footer">
          <button onClick={() => setIsLogin(!isLogin)} className="btn-text">
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
          </button>
        </div>
      </motion.div>

    </div>
  );
};

export default Auth;
