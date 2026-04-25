import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import './Hero.css';

interface HeroProps {
  onStart: () => void;
}
import ResonanceSphere from './ResonanceSphere';

export default function Hero({ onStart }: HeroProps) {
  return (
    <section className="hero-container">
      {/* 3D WebGL Background */}
      <ResonanceSphere />

      {/* Background glow elements */}
      <div className="cyber-grid" style={{ zIndex: 1, pointerEvents: 'none' }}></div>
      <div className="glow-sphere cyan-glow" style={{ zIndex: 1, pointerEvents: 'none' }}></div>
      <div className="glow-sphere purple-glow" style={{ zIndex: 1, pointerEvents: 'none' }}></div>

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
