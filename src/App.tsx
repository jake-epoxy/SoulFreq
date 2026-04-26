import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Hero from './components/Hero';
import Studio from './components/Studio';
import Assessment from './components/Assessment';
import Protocol from './components/Protocol';
import Paywall from './components/Paywall';
import AuthWall from './components/AuthWall';
import ReloadPrompt from './components/ReloadPrompt';
import Dashboard from './components/Dashboard';
import { supabase } from './lib/supabase';

export type AppStage = 'hero' | 'assessment' | 'auth' | 'studio' | 'protocol' | 'dashboard';

function App() {
  const [stage, setStage] = useState<AppStage>('hero');
  const [initialPreset, setInitialPreset] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [session, setSession] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);

  // Custom navigation to support native browser "Back" button
  const navigate = (newStage: AppStage) => {
    setStage(newStage);
    // Push to history without modifying the URL, just to create a back-stack
    window.history.pushState({ stage: newStage }, '', window.location.pathname + window.location.search);
  };

  useEffect(() => {
    // Listen for browser back/forward buttons
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.stage) {
        setStage(event.state.stage);
      } else {
        setStage('hero'); // Fallback to hero if no state
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    // Setup initial history state so the first "back" click doesn't immediately exit the app
    window.history.replaceState({ stage: 'hero' }, '', window.location.pathname + window.location.search);
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function fetchProfile(user: any) {
      if (!user) {
        setIsPremium(false);
        return false;
      }
      
      // Developer Override
      if (user.email === 'jakeflowers222@gmail.com') {
        setIsPremium(true);
        return true;
      }
      const { data } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single();
        
      if (data && data.is_premium) {
        setIsPremium(true);
        return true;
      }
      return false;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      const isUserPremium = await fetchProfile(session?.user);
      
      const urlParams = new URLSearchParams(window.location.search);
      // Auto-bypass the funnel for logged-in users on refresh
      if (session && !urlParams.get('payment')) {
        navigate('dashboard');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      fetchProfile(session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const checkPaymentSuccess = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('payment') === 'success') {
        window.history.replaceState({}, '', window.location.pathname);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { error } = await supabase
            .from('profiles')
            .update({ is_premium: true })
            .eq('id', session.user.id);
            
          if (!error) {
            setIsPremium(true);
            navigate('protocol');
          }
        } else {
            navigate('auth');
        }
      }
    };
    
    checkPaymentSuccess();
  }, []);

  return (
    <>
      <header className="top-nav">
        <div 
          style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.5px', cursor: 'pointer' }}
          onClick={() => navigate('hero')}
        >
          Kinesus<span style={{ color: 'var(--brand-cyan)' }}>.</span>
        </div>
        <nav className="top-nav-links">
          <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem' }}>The Science</a>
          {session ? (
            <>
              <button 
                style={{ background: 'none', border: 'none', color: stage === 'studio' ? 'var(--brand-cyan)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: stage === 'studio' ? 'bold' : 'normal' }}
                onClick={() => navigate('studio')}
              >
                Studio
              </button>
              <button 
                style={{ background: 'none', border: 'none', color: stage === 'dashboard' ? 'var(--brand-cyan)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: stage === 'dashboard' ? 'bold' : 'normal' }}
                onClick={() => navigate('dashboard')}
              >
                Dashboard
              </button>
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}
                onClick={() => supabase.auth.signOut().then(() => navigate('hero'))}
              >
                Sign Out
              </button>
            </>
          ) : (
            <button 
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}
              onClick={() => navigate('auth')}
            >
              Log In
            </button>
          )}
          <button 
            style={{ padding: '0.5rem 1.5rem', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.9rem', cursor: 'pointer', background: stage === 'protocol' ? 'rgba(255,255,255,0.1)' : 'transparent' }}
            onClick={() => navigate('protocol')}
          >
            The Protocol
          </button>
        </nav>
      </header>

      <main className={`main-content ${stage === 'hero' ? 'hero-stage' : ''}`}>
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
              <Hero onStart={() => navigate('assessment')} />
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
                if (session) {
                  navigate('studio');
                } else {
                  navigate('auth');
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
              <AuthWall onComplete={() => navigate('studio')} />
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
                  navigate('studio');
                }} />
              ) : (
                <Paywall onBack={() => {
                  if (session) {
                    navigate('studio');
                  } else {
                    navigate('auth');
                  }
                }} />
              )}
            </motion.div>
          )}

          {stage === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              style={{ width: '100%' }}
            >
              <Dashboard 
                onEnterStudio={() => navigate('studio')} 
                onEnterProtocol={() => navigate('protocol')} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      {stage !== 'assessment' && stage !== 'auth' && stage !== 'hero' && (
        <footer style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', fontSize: '0.9rem', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '4rem' }}>
          <p>&copy; 2026 Kinesus. High-End Frequency Engine.</p>
        </footer>
      )}

      <ReloadPrompt />
    </>
  );
}

export default App;
