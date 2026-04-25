import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, AlertTriangle, Battery, Anchor, MoonStar, ChevronDown } from 'lucide-react';
import BreathingPacer from './BreathingPacer';
import './Protocol.css';

interface ProtocolProps {
  onStartPhase: (presetId: string) => void;
}

export default function Protocol({ onStartPhase }: ProtocolProps) {
  const [activePhase, setActivePhase] = useState<number | null>(1);

  const togglePhase = (phaseId: number) => {
    setActivePhase(activePhase === phaseId ? null : phaseId);
  };

  return (
    <section className="protocol-container">
      <div className="protocol-header">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="protocol-title"
        >
          The <span className="text-gradient">Kinetic</span> Protocol
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="protocol-subtitle"
        >
          A systematic method for clearing stagnant physical tension, increasing bio-electrical density, and syncing your nervous system with the Earth's natural resonance.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="protocol-warning"
        >
          <AlertTriangle className="warning-icon" size={24} />
          <div>
            <strong>WARNING:</strong> These practices dramatically alter your nervous system's baseline frequency. Do not force the breath. If you feel dizzy, ground yourself immediately. You are intentionally building bio-electrical density.
          </div>
        </motion.div>
      </div>

      <div className="phases-accordion">
        {/* Phase 1 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`phase-card glass-panel cyan-accent ${activePhase === 1 ? 'expanded' : ''}`}
        >
          <div className="phase-header-clickable" onClick={() => togglePhase(1)}>
            <div className="phase-header-left">
              <Battery size={32} color="var(--brand-cyan)" />
              <div>
                <span className="phase-number">Phase 1</span>
                <h3 className="phase-title">The Battery</h3>
              </div>
            </div>
            <ChevronDown 
              className={`chevron-icon ${activePhase === 1 ? 'rotated' : ''}`} 
              size={24} 
              color="var(--text-secondary)" 
            />
          </div>
          
          <AnimatePresence>
            {activePhase === 1 && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="phase-content-expanded"
              >
                <div className="phase-description">
                  <p>Build a massive surplus of internal energy and stabilize your nervous system by flushing out stagnant CO2.</p>
                  <ul className="sleek-list">
                    <li>Sit comfortably and initiate the sequence below.</li>
                    <li>Follow the pacer for 15 deep, rhythmic breaths.</li>
                    <li><strong style={{color:'var(--brand-cyan)'}}>The Hold:</strong> After the final exhale, hold on empty and wait for the vibration.</li>
                  </ul>
                </div>
                
                <BreathingPacer 
                  color="var(--brand-cyan)" 
                  totalBreaths={15}
                  onStartAudio={() => onStartPhase('grounding')} 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Phase 2 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`phase-card glass-panel purple-accent ${activePhase === 2 ? 'expanded' : ''}`}
        >
          <div className="phase-header-clickable" onClick={() => togglePhase(2)}>
            <div className="phase-header-left">
              <Anchor size={32} color="var(--brand-purple)" />
              <div>
                <span className="phase-number">Phase 2</span>
                <h3 className="phase-title">The Anchor</h3>
              </div>
            </div>
            <ChevronDown 
              className={`chevron-icon ${activePhase === 2 ? 'rotated' : ''}`} 
              size={24} 
              color="var(--text-secondary)" 
            />
          </div>

          <AnimatePresence>
            {activePhase === 2 && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="phase-content-expanded"
              >
                <div className="phase-description">
                  <p>Learn to exchange energy with the environment rather than burning your own internal reserves.</p>
                  <ul className="sleek-list">
                    <li>Stand barefoot facing a large tree (horse stance).</li>
                    <li>Raise arms as if hugging the trunk.</li>
                    <li><strong style={{color:'var(--brand-purple)'}}>Inhale:</strong> Visualize pulling energy up from roots.</li>
                    <li><strong style={{color:'var(--brand-purple)'}}>Exhale:</strong> Visualize heavy energy flowing out of palms.</li>
                  </ul>
                  <button className="phase-action" onClick={() => onStartPhase('conduit')}>
                    <Play size={18} fill="currentColor" />
                    Load Audio (7.83Hz Schumann)
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Phase 3 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={`phase-card glass-panel blue-accent ${activePhase === 3 ? 'expanded' : ''}`}
        >
          <div className="phase-header-clickable" onClick={() => togglePhase(3)}>
            <div className="phase-header-left">
              <MoonStar size={32} color="#0088ff" />
              <div>
                <span className="phase-number">Phase 3</span>
                <h3 className="phase-title">The Sandbox</h3>
              </div>
            </div>
            <ChevronDown 
              className={`chevron-icon ${activePhase === 3 ? 'rotated' : ''}`} 
              size={24} 
              color="var(--text-secondary)" 
            />
          </div>

          <AnimatePresence>
            {activePhase === 3 && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="phase-content-expanded"
              >
                <div className="phase-description">
                  <p>Use the dream state to practice moving elements without physical resistance, strengthening the neural pathways.</p>
                  <ul className="sleek-list">
                    <li>Perform reality checks during the day.</li>
                    <li>Set intention before sleep: "Tonight I will realize I am dreaming."</li>
                    <li>Practice physical kinetic movements (pushing/pulling) without weight.</li>
                  </ul>
                  <button className="phase-action" onClick={() => onStartPhase('deep-sleep')}>
                    <Play size={18} fill="currentColor" />
                    Load Audio (Theta State)
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
