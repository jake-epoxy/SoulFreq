import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import './Hero.css';

interface HeroProps {
  onStart: () => void;
}

export default function Hero({ onStart }: HeroProps) {
  return (
    <section className="hero-container">
      {/* Background glow elements */}
      <div className="cyber-grid"></div>
      <div className="glow-sphere cyan-glow"></div>
      <div className="glow-sphere purple-glow"></div>

      <div className="mandala-container">
        <motion.svg 
           viewBox="0 0 200 200" 
           className="mandala"
           animate={{ rotate: 360 }}
           transition={{ duration: 80, ease: "linear", repeat: Infinity }}
        >
          <circle cx="100" cy="100" r="90" stroke="rgba(0, 240, 255, 0.1)" strokeWidth="0.5" fill="none" strokeDasharray="2 4" />
          <circle cx="100" cy="100" r="80" stroke="rgba(0, 240, 255, 0.2)" strokeWidth="1" fill="none" />
          <circle cx="100" cy="100" r="60" stroke="rgba(122, 0, 255, 0.3)" strokeWidth="1" fill="none" />
          <path d="M100 20 L100 180 M20 100 L180 100 M43 43 L157 157 M43 157 L157 43" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
          <circle cx="100" cy="100" r="40" stroke="rgba(0, 240, 255, 0.5)" strokeWidth="2" strokeDasharray="4 4" fill="none" />
          <circle cx="100" cy="100" r="20" stroke="rgba(122, 0, 255, 0.6)" strokeWidth="1" fill="none" />
        </motion.svg>
      </div>

      <div className="hero-content">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="badge glass-panel"
        >
          <Activity size={16} className="badge-icon" />
          <span>AI-Powered Sound Healing</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="hero-title"
        >
          Discover Your <span className="text-gradient">Frequency</span><br />
          Prescription.
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="hero-subtitle"
        >
          Calibrate your mind, body, and spirit with scientifically backed 
          binaural beats, ambient soundscapes, and ancient solfeggio frequencies.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.3 }}
          onClick={onStart}
          className="cta-button glass-panel"
        >
          Start Your Session
        </motion.button>
      </div>
    </section>
  );
}
