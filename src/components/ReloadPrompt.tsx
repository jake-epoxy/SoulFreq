
import { useRegisterSW } from 'virtual:pwa-register/react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';

export default function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Periodically check for updates every 60 minutes
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {(offlineReady || needRefresh) && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          style={{
            position: 'fixed',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            width: '90%',
            maxWidth: '400px',
            background: 'rgba(5, 5, 15, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '1.25rem',
            boxShadow: '0 10px 40px rgba(0, 240, 255, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                background: 'rgba(0, 240, 255, 0.1)', 
                padding: '0.5rem', 
                borderRadius: '50%',
                color: '#00F0FF'
              }}>
                <RefreshCw size={20} className={needRefresh ? 'animate-spin' : ''} />
              </div>
              <div>
                <h4 style={{ color: '#fff', margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                  {needRefresh ? 'Protocol Upgrade Available' : 'Ready for Offline Use'}
                </h4>
                <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {needRefresh 
                    ? 'A new version of Kinesus has been downloaded.' 
                    : 'The audio engine is cached for offline sessions.'}
                </p>
              </div>
            </div>
            <button 
              onClick={close}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '0.25rem' }}
            >
              <X size={16} />
            </button>
          </div>

          {needRefresh && (
            <button 
              onClick={() => updateServiceWorker(true)}
              style={{
                background: 'linear-gradient(90deg, #00F0FF, #0088FF)',
                color: '#000',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                width: '100%',
                boxShadow: '0 4px 15px rgba(0, 240, 255, 0.2)'
              }}
            >
              Apply Upgrade Now
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
