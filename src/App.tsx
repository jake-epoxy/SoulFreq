import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Hero from './components/Hero';
import Studio from './components/Studio';
import Assessment from './components/Assessment';
import Protocol from './components/Protocol';
import Paywall from './components/Paywall';
import AuthWall from './components/AuthWall';
import { supabase } from './lib/supabase';

export type AppStage = 'hero' | 'assessment' | 'auth' | 'studio' | 'protocol';

function App() {
  const [stage, setStage] = useState<AppStage>('hero');
  const [initialPreset, setInitialPreset] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  
  // Premium Paywall State
  const [isPremium, setIsPremium] = useState(() => {
    return localStorage.getItem('kinesus_premium') === 'true';
  });

  // Handle Supabase Session & Stripe Redirect
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      setIsPremium(true);
      localStorage.setItem('kinesus_premium', 'true');
      window.history.replaceState({}, '', window.location.pathname);
      setStage('protocol');
    }

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <header style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '2rem', display: 'flex', justifyContent: 'space-between', zIndex: 100 }}>
        <div 
          style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.5px', cursor: 'pointer' }}
          onClick={() => setStage('hero')}
        >
          Kinesus<span style={{ color: 'var(--brand-cyan)' }}>.</span>
        </div>
        <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem' }}>The Science</a>
          {session ? (
            <button 
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}
              onClick={() => supabase.auth.signOut().then(() => setStage('hero'))}
            >
              Sign Out
            </button>
          ) : (
            <button 
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}
              onClick={() => setStage('auth')}
            >
              Log In
            </button>
          )}
          <button 
            style={{ padding: '0.5rem 1.5rem', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.9rem', cursor: 'pointer', background: stage === 'protocol' ? 'rgba(255,255,255,0.1)' : 'transparent' }}
            onClick={() => setStage('protocol')}
          >
            The Protocol
          </button>
        </nav>
      </header>

      <main style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AnimatePresence mode="wait">
          {stage === 'hero' && (
            <motion.div 
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.5 }}
              style={{ width: '100%' }}
            >
              <Hero onStart={() => setStage('assessment')} />
            </motion.div>
          )}

          {stage === 'assessment' && (
            <motion.div 
              key="assessment"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}
              style={{ width: '100%' }}
            >
              <Assessment onComplete={(presetId) => {
                setInitialPreset(presetId);
                // If they already have an account, skip AuthWall
                if (session) {
                  setStage('studio');
                } else {
                  setStage('auth');
                }
              }} />
            </motion.div>
          )}

          {stage === 'auth' && (
            <motion.div 
              key="auth"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              style={{ width: '100%' }}
            >
              <AuthWall onComplete={() => setStage('studio')} />
            </motion.div>
          )}

          {stage === 'studio' && (
            <motion.div 
              key="studio"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ width: '100%' }}
            >
              <Studio initialPreset={initialPreset} isPremium={isPremium} />
            </motion.div>
          )}

          {stage === 'protocol' && (
            <motion.div 
              key="protocol"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ width: '100%' }}
            >
              {isPremium ? (
                <Protocol onStartPhase={(presetId) => {
                  setInitialPreset(presetId);
                  setStage('studio');
                }} />
              ) : (
                <Paywall onBack={() => setStage('studio')} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      {stage !== 'assessment' && stage !== 'auth' && (
        <footer style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', fontSize: '0.9rem', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '4rem' }}>
          <p>&copy; 2026 Kinesus. High-End Frequency Engine.</p>
        </footer>
      )}
    </>
  );
}

export default App;
