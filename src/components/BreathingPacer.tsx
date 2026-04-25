import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square } from 'lucide-react';
import './BreathingPacer.css';

interface BreathingPacerProps {
  color: string;
  totalBreaths?: number;
  onStartAudio?: () => void;
  onComplete?: () => void;
}

type PacerPhase = 'idle' | 'inhale' | 'exhale' | 'hold' | 'complete';

export default function BreathingPacer({ 
  color, 
  totalBreaths = 15,
  onStartAudio,
  onComplete 
}: BreathingPacerProps) {
  const [phase, setPhase] = useState<PacerPhase>('idle');
  const [breathsRemaining, setBreathsRemaining] = useState(totalBreaths);
  const [holdTime, setHoldTime] = useState(0);

  // Breathing Loop
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (phase === 'inhale') {
      timer = setTimeout(() => setPhase('exhale'), 2500); // 2.5s inhale
    } else if (phase === 'exhale') {
      timer = setTimeout(() => {
        if (breathsRemaining > 1) {
          setBreathsRemaining(prev => prev - 1);
          setPhase('inhale');
        } else {
          setPhase('hold');
          setBreathsRemaining(0);
        }
      }, 2500); // 2.5s exhale
    }

    return () => clearTimeout(timer);
  }, [phase, breathsRemaining]);

  // Hold Stopwatch
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (phase === 'hold') {
      interval = setInterval(() => {
        setHoldTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase]);

  const handleStart = () => {
    if (onStartAudio) onStartAudio();
    setPhase('inhale');
    setBreathsRemaining(totalBreaths);
    setHoldTime(0);
  };

  const handleStop = () => {
    setPhase('complete');
    if (onComplete) onComplete();
  };

  const handleReset = () => {
    setPhase('idle');
    setBreathsRemaining(totalBreaths);
    setHoldTime(0);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="pacer-container">
      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.div 
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pacer-idle"
          >
            <button 
              className="pacer-start-btn" 
              onClick={handleStart}
              style={{ '--btn-color': color } as React.CSSProperties}
            >
              <Play size={24} fill="currentColor" />
              <span>Initiate Sequence</span>
            </button>
            <p className="pacer-hint">Ensure you are sitting comfortably before starting.</p>
          </motion.div>
        )}

        {(phase === 'inhale' || phase === 'exhale') && (
          <motion.div 
            key="breathing"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="pacer-active"
          >
            <div className="pacer-text-container">
              <motion.h3 
                key={phase}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pacer-instruction"
                style={{ color }}
              >
                {phase === 'inhale' ? 'Inhale' : 'Exhale'}
              </motion.h3>
              <div className="pacer-counter">{breathsRemaining} Breaths Left</div>
            </div>

            <div className="pacer-visual">
              <motion.div 
                className="pacer-circle"
                animate={{ 
                  scale: phase === 'inhale' ? 1.5 : 0.8,
                  opacity: phase === 'inhale' ? 0.8 : 0.3
                }}
                transition={{ 
                  duration: 2.5, 
                  ease: "easeInOut" 
                }}
                style={{ 
                  backgroundColor: color,
                  boxShadow: `0 0 40px ${color}`
                }}
              />
              <div className="pacer-circle-core" />
            </div>
          </motion.div>
        )}

        {phase === 'hold' && (
          <motion.div 
            key="hold"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            className="pacer-hold"
          >
            <div className="pacer-hold-content">
              <h3 style={{ color }}>Hold on Empty</h3>
              <p>Focus entirely on the lower belly. Wait for the vibration.</p>
              <div className="pacer-timer">{formatTime(holdTime)}</div>
              
              <button 
                className="pacer-stop-btn" 
                onClick={handleStop}
              >
                <Square size={20} fill="currentColor" />
                <span>End Hold</span>
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'complete' && (
          <motion.div 
            key="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pacer-complete"
          >
            <h3 style={{ color }}>Sequence Complete</h3>
            <p>Your nervous system has successfully down-regulated. Time held: {formatTime(holdTime)}</p>
            <button className="pacer-reset-btn" onClick={handleReset}>
              Return to Idle
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
