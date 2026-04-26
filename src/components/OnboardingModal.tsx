import { useState } from 'react';
import './OnboardingModal.css';
import { Settings2 } from 'lucide-react';

interface OnboardingModalProps {
  onInitiate: () => void;
  onSkip: () => void;
}

export default function OnboardingModal({ onInitiate, onSkip }: OnboardingModalProps) {
  const [isVisible, setIsVisible] = useState(() => !localStorage.getItem('kinetic_onboarding_complete'));

  const handleInitiate = () => {
    localStorage.setItem('kinetic_onboarding_complete', 'true');
    setIsVisible(false);
    onInitiate();
  };

  const handleSkip = () => {
    localStorage.setItem('kinetic_onboarding_complete', 'true');
    setIsVisible(false);
    onSkip();
  };

  if (!isVisible) return null;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <div className="modal-header">
          <Settings2 size={24} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
          <div className="modal-eyebrow">The Kinetic Protocol</div>
          <h2 className="modal-title">Calibrate your nervous system.</h2>
        </div>

        <div className="modal-steps">
          <div className="modal-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <span className="step-title">Isolate.</span>
              <span className="step-desc">Headphones on. Eliminate visual stimuli. Put your phone face down.</span>
            </div>
          </div>
          
          <div className="modal-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <span className="step-title">Submerge.</span>
              <span className="step-desc">Press initiate, close your eyes, and let the Euphoric Wash break your current anxiety loop.</span>
            </div>
          </div>

          <div className="modal-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <span className="step-title">Tune.</span>
              <span className="step-desc">Only after the wash completes, slowly introduce bio-resonant frequencies to lock in your state.</span>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="modal-cta" onClick={handleInitiate}>
            Initiate Protocol
          </button>
          <button className="modal-skip" onClick={handleSkip}>
            Skip Calibration
          </button>
        </div>
      </div>
    </div>
  );
}
