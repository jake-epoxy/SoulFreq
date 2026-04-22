import { motion } from 'framer-motion';
import { Play, AlertTriangle, Battery, Anchor, MoonStar } from 'lucide-react';
import './Protocol.css';

interface ProtocolProps {
  onStartPhase: (presetId: string) => void;
}

export default function Protocol({ onStartPhase }: ProtocolProps) {
  return (
    <section className="protocol-container">
      <div className="protocol-header">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="protocol-title"
        >
          The <span className="text-gradient">SoulFreq</span> Protocol
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

      <div className="phases-grid">
        {/* Phase 1 */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="phase-card glass-panel cyan-accent"
        >
          <div className="phase-header">
            <Battery size={32} color="var(--brand-cyan)" />
            <div>
              <span className="phase-number">Phase 1</span>
              <h3 className="phase-title">The Battery</h3>
            </div>
          </div>
          <div className="phase-content">
            <p>Build a massive surplus of internal energy and stabilize your nervous system by flushing out stagnant CO2.</p>
            <div className="phase-instructions">
              <h4>The Practice</h4>
              <ol>
                <li>Find a quiet place to sit comfortably.</li>
                <li>Do 15-20 deep, rhythmic breaths (in through nose, out through mouth).</li>
                <li>On the last exhale, do not inhale. Hold your breath on <strong>empty</strong>.</li>
                <li>Focus entirely on the lower belly (Dantian). Wait for the heat or subtle vibration.</li>
              </ol>
            </div>
          </div>
          <button className="phase-action" onClick={() => onStartPhase('grounding')}>
            <Play size={18} fill="currentColor" />
            Load Audio (432Hz Anchor)
          </button>
        </motion.div>

        {/* Phase 2 */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="phase-card glass-panel purple-accent"
        >
          <div className="phase-header">
            <Anchor size={32} color="var(--brand-purple)" />
            <div>
              <span className="phase-number">Phase 2</span>
              <h3 className="phase-title">The Anchor</h3>
            </div>
          </div>
          <div className="phase-content">
            <p>Learn to exchange energy with the environment rather than burning your own internal reserves.</p>
            <div className="phase-instructions">
              <h4>The Practice</h4>
              <ol>
                <li>Stand barefoot facing a large tree, assuming a horse stance.</li>
                <li>Raise arms as if hugging the trunk (6 inches away).</li>
                <li><strong>Inhale:</strong> Visualize pulling energy up from the roots.</li>
                <li><strong>Exhale:</strong> Visualize heavy, stagnant energy flowing out of your palms.</li>
              </ol>
            </div>
          </div>
          <button className="phase-action" onClick={() => onStartPhase('conduit')}>
            <Play size={18} fill="currentColor" />
            Load Audio (7.83Hz Schumann)
          </button>
        </motion.div>

        {/* Phase 3 */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="phase-card glass-panel blue-accent"
        >
          <div className="phase-header">
            <MoonStar size={32} color="#0088ff" />
            <div>
              <span className="phase-number">Phase 3</span>
              <h3 className="phase-title">The Sandbox</h3>
            </div>
          </div>
          <div className="phase-content">
            <p>Use the dream state to practice moving elements without physical resistance, strengthening the neural pathways.</p>
            <div className="phase-instructions">
              <h4>The Practice</h4>
              <ol>
                <li>Throughout the day, perform reality checks (e.g., trying to push a finger through your palm).</li>
                <li>Before bed, set the firm intention: "Tonight I will realize I am dreaming."</li>
                <li>Once lucid, practice physical kinetic movements (pushing/pulling) without physical weight.</li>
              </ol>
            </div>
          </div>
          <button className="phase-action" onClick={() => onStartPhase('deep-sleep')}>
            <Play size={18} fill="currentColor" />
            Load Audio (Theta State)
          </button>
        </motion.div>
      </div>
    </section>
  );
}
