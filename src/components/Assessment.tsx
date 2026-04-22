import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Activity, BrainCircuit, Sparkles } from 'lucide-react';
import './Assessment.css';

interface AssessmentProps {
  onComplete: (presetId: string) => void;
}

const QUESTIONS = [
  {
    id: 'goal',
    title: 'What is your primary energetic goal?',
    options: [
      { label: 'Bio-Electric Synchronization', icon: Sparkles },
      { label: 'Deep Nervous System Reset', icon: BrainCircuit },
      { label: 'Breath & Body Stewardship', icon: Sparkles },
      { label: 'Physical Trauma Release', icon: Activity },
      { label: 'Clear & Focused Dominion', icon: BrainCircuit }
    ]
  },
  {
    id: 'state',
    title: 'How would you describe your current state?',
    options: [
      { label: 'Scattered & Disconnected from Nature' },
      { label: 'Carrying Stagnant Physical Tension' },
      { label: 'Out of Rhythm / Exhausted' },
      { label: 'Mentally Overstimulated' },
      { label: 'Clear but Unanchored' }
    ]
  },
  {
    id: 'environment',
    title: 'Which natural environment grounds you most?',
    options: [
      { label: 'Ancient Cedar Forest' },
      { label: 'Deep Earth Cave' },
      { label: 'High Mountain Air' },
      { label: 'Ocean at Midnight' }
    ]
  }
];

export default function Assessment({ onComplete }: AssessmentProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);

  const handleSelect = (optionLabel: string) => {
    setAnswers(prev => [...prev, optionLabel]);
    
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsAnalyzing(true);
    }
  };

  useEffect(() => {
    if (isAnalyzing) {
      const timer = setTimeout(() => {
        // Derive preset from first answer
        const primaryGoal = answers[0];
        let presetId = 'grounding'; // default
        
        if (primaryGoal.includes('Synchronization') || primaryGoal.includes('Dominion')) presetId = 'conduit';
        if (primaryGoal.includes('Reset')) presetId = 'deep-sleep';
        if (primaryGoal.includes('Stewardship')) presetId = 'grounding';
        if (primaryGoal.includes('Trauma')) presetId = 'release';

        onComplete(presetId);
      }, 3500); // 3.5 seconds of fake "Analyzing bio-resonance"
      return () => clearTimeout(timer);
    }
  }, [isAnalyzing, onComplete, answers]);

  return (
    <div className="assessment-container">
      <AnimatePresence mode="wait">
        {!isAnalyzing ? (
          <motion.div
            key={`question-${currentStep}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="quiz-card glass-panel"
          >
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentStep + 1) / QUESTIONS.length) * 100}%` }}
              ></div>
            </div>
            
            <p className="step-indicator">Step {currentStep + 1} of {QUESTIONS.length}</p>
            <h2 className="question-title">{QUESTIONS[currentStep].title}</h2>
            
            <div className="options-grid">
              {QUESTIONS[currentStep].options.map((option, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(option.label)}
                  className="option-button"
                >
                  {option.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="analyzing-state"
          >
            <div className="spinner-container">
              <Loader2 className="spinner-icon cyan-icon" size={64} />
            </div>
            <h2 className="analyzing-title">Analyzing Bio-Resonance...</h2>
            <p className="analyzing-subtitle">Calibrating your custom frequency stack</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
