import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Zap, Activity, Shield } from 'lucide-react';
import './Paywall.css';

interface PaywallProps {
  onBack: () => void;
  isOverlay?: boolean;
}

const Paywall: React.FC<PaywallProps> = ({ onBack, isOverlay = false }) => {
  // Replace this with your actual Stripe Payment Link
  const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/eVq28r5vseADc3V4CBe7m01';

  return (
    <div className={`paywall-container ${isOverlay ? 'overlay-mode' : ''}`}>
      <div className="paywall-content">
        <motion.div 
          className="paywall-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="lock-icon-container">
            <Lock size={32} className="lock-icon" />
          </div>
          <h2>Unlock The Kinetic Protocol</h2>
          <p>Gain full access to the step-by-step somatic mastery system.</p>
        </motion.div>

        <motion.div 
          className="paywall-features"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="feature-item">
            <Zap size={20} className="feature-icon" />
            <div className="feature-text">
              <h4>Advanced Frequencies</h4>
              <p>Unlock all neuro-acoustic tracks for deep state access.</p>
            </div>
          </div>
          <div className="feature-item">
            <Activity size={20} className="feature-icon" />
            <div className="feature-text">
              <h4>Guided Somatic Training</h4>
              <p>Step-by-step protocols to regulate your nervous system.</p>
            </div>
          </div>
          <div className="feature-item">
            <Shield size={20} className="feature-icon" />
            <div className="feature-text">
              <h4>Premium Access</h4>
              <p>Unrestricted access to the entire Kinetic Engine.</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="paywall-cta"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <a href={STRIPE_PAYMENT_LINK} className="unlock-button">
            Unlock Full Access — $9 / Month
          </a>
          {!isOverlay && (
            <button className="back-button" onClick={onBack}>
              Return to Studio
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Paywall;
