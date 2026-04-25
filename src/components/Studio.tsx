import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Sliders, Waves, ActivitySquare, Speaker, Zap, MoonStar, Anchor, Square } from 'lucide-react';
import { useAudioEngine } from '../hooks/useAudioEngine';
import type { FrequencyChannel } from '../hooks/useAudioEngine';
import './Studio.css';

interface Config {
  name: FrequencyChannel;
  effect: string;
  value: number;
}

const INITIAL_FREQUENCIES: Config[] = [
  { name: '174 Hz', effect: 'Karmic Clearing', value: 0 },
  { name: '396 Hz', effect: 'Release Guilt', value: 0 },
  { name: '432 Hz', effect: 'Healing & Harmony', value: 0 },
  { name: '528 Hz', effect: 'DNA Repair', value: 0 },
  { name: '852 Hz', effect: 'Third Eye Awakening', value: 0 },
  { name: '963 Hz', effect: 'Pineal Activation', value: 0 },
  { name: 'Alpha', effect: 'Deep Focus', value: 0 },
  { name: 'Theta', effect: 'Meditation', value: 0 },
];

const INITIAL_AMBIENTS: Config[] = [
  { name: 'Void', effect: 'Brown Noise Synthesis', value: 0 },
  { name: 'White', effect: 'Full Spectrum Static', value: 0 },
  { name: 'Rain', effect: 'Pink Noise Synthesis', value: 0 },
  { name: 'Vinyl', effect: 'ASMR Crackle Texture', value: 0 },
];

const PRESETS = [
  {
    id: 'grounding',
    title: 'The Baseline Anchor',
    desc: 'Warm 432Hz baseline with heavy Void noise to anchor the nervous system back to its natural design.',
    icon: Anchor,
    color: 'preset-cyan',
    settings: {
      freqs: { '174 Hz': 0, '396 Hz': 60, '432 Hz': 80, '528 Hz': 0, '852 Hz': 0, '963 Hz': 0, 'Alpha': 10, 'Theta': 0 },
      ambients: { 'Void': 100, 'White': 0, 'Rain': 20, 'Vinyl': 10 },
      custom: { vol: 0, base: 432, offset: 0, wave: 'sine' as OscillatorType, isoRate: 0, isoDepth: 0 }
    }
  },
  {
    id: 'deep-sleep',
    title: 'Deep Restoration',
    desc: 'Heavy void rumble with standard 4Hz Theta tracking for optimal physical recovery.',
    icon: MoonStar,
    color: 'preset-blue',
    settings: {
      freqs: { '174 Hz': 0, '396 Hz': 0, '432 Hz': 20, '528 Hz': 0, '852 Hz': 0, '963 Hz': 0, 'Alpha': 0, 'Theta': 60 },
      ambients: { 'Void': 100, 'White': 0, 'Rain': 40, 'Vinyl': 0 },
      custom: { vol: 0, base: 432, offset: 0, wave: 'sine' as OscillatorType, isoRate: 0, isoDepth: 0 }
    }
  },
  {
    id: 'release',
    title: 'Physical Tension Release',
    desc: 'Heavy 396Hz and 174Hz Solfeggio to unlock deep somatic tension and stuck physical loops.',
    icon: Waves,
    color: 'preset-purple',
    settings: {
      freqs: { '174 Hz': 40, '396 Hz': 90, '432 Hz': 0, '528 Hz': 0, '852 Hz': 0, '963 Hz': 0, 'Alpha': 0, 'Theta': 0 },
      ambients: { 'Void': 40, 'White': 0, 'Rain': 60, 'Vinyl': 0 },
      custom: { vol: 0, base: 396, offset: 0, wave: 'sine' as OscillatorType, isoRate: 0, isoDepth: 0 }
    }
  },
  {
    id: 'conduit',
    title: 'The Conduit State',
    desc: 'Intense 852Hz carrier mapped with aggressive 7.83Hz Schumann resonance to sync your bio-field with the earth.',
    icon: ActivitySquare,
    color: 'preset-cyan',
    settings: {
      freqs: { '174 Hz': 0, '396 Hz': 0, '432 Hz': 0, '528 Hz': 0, '852 Hz': 90, '963 Hz': 40, 'Alpha': 0, 'Theta': 0 },
      ambients: { 'Void': 80, 'White': 20, 'Rain': 0, 'Vinyl': 10 },
      custom: { vol: 40, base: 852, offset: 0, wave: 'sawtooth' as OscillatorType, isoRate: 7.83, isoDepth: 100 }
    }
  },
  {
    id: 'focus',
    title: 'Clear Dominion',
    desc: 'High Alpha brainwave tracking with ASMR Vinyl overlays for extreme, clear-headed focus.',
    icon: Zap,
    color: 'preset-cyan',
    settings: {
      freqs: { '174 Hz': 0, '396 Hz': 0, '432 Hz': 0, '528 Hz': 50, '852 Hz': 0, '963 Hz': 0, 'Alpha': 70, 'Theta': 0 },
      ambients: { 'Void': 30, 'White': 40, 'Rain': 20, 'Vinyl': 50 },
      custom: { vol: 0, base: 432, offset: 0, wave: 'sine' as OscillatorType, isoRate: 0, isoDepth: 0 }
    }
  }
];

interface StudioProps {
  initialPreset?: string | null;
}

export default function Studio({ initialPreset }: StudioProps) {
  const { isPlaying, togglePlay, setVolume, updateCustomNode, updateIsochronic, getAnalyser, isRecording, startRecording, stopRecording, triggerSweep } = useAudioEngine();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [frequencies, setFrequencies] = useState<Config[]>(INITIAL_FREQUENCIES);
  const [ambients, setAmbients] = useState<Config[]>(INITIAL_AMBIENTS);
  const [customVol, setCustomVol] = useState(0);
  const [customBase, setCustomBase] = useState(432); 
  const [customOffset, setCustomOffset] = useState(0); 
  const [customWave, setCustomWave] = useState<OscillatorType>('sine');
  const [isoRate, setIsoRate] = useState(7.8);
  const [isoDepth, setIsoDepth] = useState(0);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const hasInitializedAudioRef = useRef(false);

  useEffect(() => {
    if (!hasInitializedAudioRef.current) {
        let presetToLoad = PRESETS[0]; // Auto load Deep Sleep default
        if (initialPreset) {
            const found = PRESETS.find(p => p.id === initialPreset);
            if (found) presetToLoad = found;
        }
        applyPreset(presetToLoad);
        hasInitializedAudioRef.current = true;
    }
  }, [initialPreset]);

  // Visualizer Loop
  useEffect(() => {
    let animationFrameId: number;
     
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const analyser = getAnalyser();
      if (!analyser) {
        ctx.clearRect(0,0, canvas.width, canvas.height);
        animationFrameId = requestAnimationFrame(render);
        return;
      }
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate average intensity
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;

      // Base radius and center
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Dynamic variables based on intensity
      const reactiveRadius = 80 + (average * 0.4);
      const intensityPct = average / 255;

      // Draw glowing outer ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, reactiveRadius, 0, 2 * Math.PI);
      ctx.lineWidth = 3 + (intensityPct * 5);
      
      // Gradient stroke
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, `rgba(0, 240, 255, ${0.1 + intensityPct})`);
      gradient.addColorStop(1, `rgba(122, 0, 255, ${0.1 + intensityPct})`);
      
      ctx.strokeStyle = gradient;
      ctx.shadowBlur = 10 + (intensityPct * 20);
      ctx.shadowColor = '#00F0FF';
      ctx.stroke();

      // Draw internal pulsing dots or waveform
      ctx.beginPath();
      for (let i = 0; i < bufferLength; i+=4) {
          const v = dataArray[i] / 255.0;
          const r = 60 + (v * 30);
          const theta = (i / bufferLength) * 2 * Math.PI;
          const x = centerX + r * Math.cos(theta);
          const y = centerY + r * Math.sin(theta);
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + (intensityPct * 0.5)})`;
      ctx.shadowBlur = 0;
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };
     
    render();
     
    return () => cancelAnimationFrame(animationFrameId);
  }, [getAnalyser]);

  const applyPreset = (preset: typeof PRESETS[0]) => {
     setActivePreset(preset.id);

     const newFreqs = frequencies.map(f => ({ ...f, value: preset.settings.freqs[f.name as keyof typeof preset.settings.freqs] }));
     setFrequencies(newFreqs);
     
     const newAmbs = ambients.map(a => ({ ...a, value: preset.settings.ambients[a.name as keyof typeof preset.settings.ambients] }));
     setAmbients(newAmbs);

     setCustomVol(preset.settings.custom.vol);
     setCustomBase(preset.settings.custom.base);
     setCustomOffset(preset.settings.custom.offset);
     setCustomWave(preset.settings.custom.wave);
     setIsoRate(preset.settings.custom.isoRate);
     setIsoDepth(preset.settings.custom.isoDepth);

     // Instantly update Audio Engine
     newFreqs.forEach(f => setVolume(f.name, f.value));
     newAmbs.forEach(a => setVolume(a.name, a.value));
     setVolume('Custom', preset.settings.custom.vol);
     updateCustomNode(preset.settings.custom.base, preset.settings.custom.offset, preset.settings.custom.wave);
     updateIsochronic(preset.settings.custom.isoRate, preset.settings.custom.isoDepth);
  };

  const handleFreqChange = (idx: number, newValue: number) => {
    setActivePreset(null); 
    const updated = [...frequencies];
    updated[idx].value = newValue;
    setFrequencies(updated);
    setVolume(updated[idx].name, newValue);
  };
  
  const handleAmbientChange = (idx: number, newValue: number) => {
    setActivePreset(null);
    const updated = [...ambients];
    updated[idx].value = newValue;
    setAmbients(updated);
    setVolume(updated[idx].name, newValue);
  };

  const handleCustomParamChange = (base: number, offset: number, wave: OscillatorType) => {
    setActivePreset(null);
    setCustomBase(base);
    setCustomOffset(offset);
    setCustomWave(wave);
    updateCustomNode(base, offset, wave);
  };

  const handleIsoParamChange = (rate: number, depth: number) => {
    setActivePreset(null);
    setIsoRate(rate);
    setIsoDepth(depth);
    updateIsochronic(rate, depth);
  };

  const handleCustomVolChange = (val: number) => {
    setActivePreset(null);
    setCustomVol(val);
    setVolume('Custom', val);
    updateIsochronic(isoRate, isoDepth); 
  };

  return (
    <section className="studio-container">
      <div className="studio-header">
        <motion.h2 
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           className="studio-title"
        >
          Your Sonic <span className="text-gradient">Workspace</span>
        </motion.h2>
        <p className="studio-subtitle">Select a curated journey, or customize your own stack.</p>
      </div>

      {/* Journeys / Presets */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="journeys-grid"
      >
        {PRESETS.map((p) => {
           const Icon = p.icon;
           const isActive = activePreset === p.id;
           return (
             <div 
               key={p.id} 
               onClick={() => applyPreset(p)}
               className={`journey-card ${isActive ? 'active' : ''} ${p.color}`}
             >
               <div className="journey-icon-wrap">
                 <Icon size={24} />
               </div>
               <div className="journey-content">
                  <h4>{p.title}</h4>
                  <p>{p.desc}</p>
               </div>
               {isActive && <div className="active-indicator" />}
             </div>
           );
        })}
      </motion.div>

      <div className="studio-grid" style={{ marginTop: '3rem' }}>
        {/* Frequencies Panel */}
        <motion.div className="panel glass-panel">
          <div className="panel-header">
            <Sliders size={20} className="panel-icon cyan-icon" />
            <h3>Presets</h3>
          </div>
          <div className="sliders-container">
            {frequencies.map((freq, idx) => (
              <div key={idx} className="slider-group">
                <div className="slider-info">
                  <span className="slider-name">{freq.name}</span>
                  <span className="slider-effect">{freq.effect}</span>
                </div>
                <div className="slider-track-wrapper">
                    <input 
                      type="range" min="0" max="100" value={freq.value}
                      onChange={(e) => handleFreqChange(idx, parseInt(e.target.value))}
                      className="slider-input"
                    />
                    <div className="slider-track">
                      <motion.div animate={{ width: `${freq.value}%` }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="slider-fill" />
                      <motion.div animate={{ left: `${freq.value}%` }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="slider-thumb" />
                    </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Center Console */}
        <motion.div className="panel glass-panel center-console" style={{ position: 'relative' }}>
          <button 
            className={`record-action-button ${isRecording ? 'recording' : ''}`} 
            onClick={isRecording ? stopRecording : startRecording}
            title={isRecording ? "Stop & Download Session (.webm)" : "Record Studio Session"}
          >
            {isRecording ? <Square fill="currentColor" size={14} style={{ color: '#ff2a2a' }} /> : <div className="record-dot" />}
            <span style={{ color: isRecording ? '#ff2a2a' : 'inherit' }}>{isRecording ? 'REC...' : 'REC'}</span>
          </button>

          <div className={`visualizer-ring ${isPlaying ? 'playing' : ''}`}>
             <canvas ref={canvasRef} width={250} height={250} className="visualizer-canvas" />
             <div className="inner-ring">
                <button className="play-button" onClick={togglePlay}>
                  {isPlaying ? <Pause fill="currentColor" size={32} /> : <Play fill="currentColor" size={32} style={{ marginLeft: '4px' }} />}
                </button>
             </div>
          </div>
          <div className="track-info">
             <h4>{isPlaying ? 'Synthesizing...' : 'Live Engine Ready'}</h4>
             <p>Dynamics Compressor: ACTIVE</p>
          </div>
        </motion.div>

        {/* Synthesized Ambients Panel */}
        <motion.div className="panel glass-panel">
          <div className="panel-header">
            <Waves size={20} className="panel-icon purple-icon" />
            <h3>Procedural Textures</h3>
          </div>

          <div className="sliders-container">
            {ambients.map((amb, idx) => (
              <div key={idx} className="slider-group">
                <div className="slider-info">
                  <span className="slider-name" style={{ color: 'var(--brand-purple)' }}>{amb.name}</span>
                  <span className="slider-effect">{amb.effect}</span>
                </div>
                <div className="slider-track-wrapper">
                    <input 
                      type="range" min="0" max="100" value={amb.value}
                      onChange={(e) => handleAmbientChange(idx, parseInt(e.target.value))}
                      className="slider-input"
                    />
                    <div className="slider-track purple-track">
                      <motion.div animate={{ width: `${amb.value}%` }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="slider-fill" />
                      <motion.div animate={{ left: `${amb.value}%` }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="slider-thumb" />
                    </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Pro Custom Engine */}
      <motion.div className="panel glass-panel custom-engine-panel">
        <div className="panel-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <ActivitySquare size={20} className="panel-icon cyan-icon" />
            <h3>Pro Synthesizer (Custom Target)</h3>
          </div>
          <div className="badge glass-panel" style={{ margin: 0, padding: '4px 12px' }}>
            <Speaker size={14} className="badge-icon" style={{ color: '#00ff88' }} />
            <span style={{ color: '#fff', fontSize: '0.75rem' }}>Speaker-Friendly</span>
          </div>
        </div>

        <div style={{ marginBottom: '2rem', marginTop: '1rem', padding: '1.5rem', background: 'rgba(255, 0, 85, 0.05)', border: '1px solid rgba(255, 0, 85, 0.2)', borderRadius: '12px' }}>
            <h4 style={{ color: '#ff0055', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} />
              The Golden Ratio Drop
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.5 }}>
              Trigger a massive parasympathetic sweep using descending Shepard Tones. This forces the nervous system to mimic the sensation of physical dropping, instantly breaking anxiety loops.
            </p>
            <button 
              className="cta-button"
              style={{ width: '100%', padding: '0.75rem', background: 'linear-gradient(90deg, #ff0055, #cc0044)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
              onClick={() => triggerSweep(800, 174, 15)}
            >
              Trigger Golden Sweep (15s Drop)
            </button>
        </div>

        <div className="custom-controls-grid">
          {/* Channel Volume */}
          <div className="custom-control">
            <div className="control-label">
              <span>Channel Volume</span>
              <span className="val-badge">{customVol}%</span>
            </div>
            <div className="slider-track-wrapper">
              <input 
                type="range" min="0" max="100" value={customVol}
                onChange={(e) => handleCustomVolChange(parseInt(e.target.value))}
                className="slider-input"
              />
              <div className="slider-track cyan-track">
                <motion.div animate={{ width: `${customVol}%` }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="slider-fill" />
                <motion.div animate={{ left: `${customVol}%` }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="slider-thumb" />
              </div>
            </div>
          </div>

          <div className="custom-control">
            <div className="control-label">
              <span>Oscillator Waveform</span>
            </div>
            <div className="wave-selectors">
              {['sine', 'triangle', 'sawtooth'].map((wave) => (
                <button 
                  key={wave}
                  className={`wave-button ${customWave === wave ? 'active' : ''}`}
                  onClick={() => handleCustomParamChange(customBase, customOffset, wave as OscillatorType)}
                >
                  {wave}
                </button>
              ))}
            </div>
          </div>

          {/* Base Frequency */}
          <div className="custom-control">
            <div className="control-label">
              <span>Base Frequency (Carrier)</span>
              <span className="val-badge">{customBase} Hz</span>
            </div>
            <div className="slider-track-wrapper">
              <input 
                type="range" min="100" max="1000" value={customBase}
                onChange={(e) => handleCustomParamChange(parseInt(e.target.value), customOffset, customWave)}
                className="slider-input"
              />
              <div className="slider-track">
                <motion.div animate={{ width: `${((customBase - 100) / 900) * 100}%` }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="slider-fill" />
                <motion.div animate={{ left: `${((customBase - 100) / 900) * 100}%` }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="slider-thumb" />
              </div>
            </div>
          </div>

          {/* Binaural Offset */}
          <div className="custom-control">
            <div className="control-label">
              <span>Binaural Offset (Headphones Only)</span>
              <span className="val-badge">{customOffset} Hz</span>
            </div>
            <div className="slider-track-wrapper">
              <input 
                type="range" min="0" max="40" step="0.1" value={customOffset}
                onChange={(e) => handleCustomParamChange(customBase, parseFloat(e.target.value), customWave)}
                className="slider-input"
              />
              <div className="slider-track purple-track">
                <motion.div animate={{ width: `${(customOffset / 40) * 100}%` }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="slider-fill" />
                <motion.div animate={{ left: `${(customOffset / 40) * 100}%` }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="slider-thumb" />
              </div>
            </div>
          </div>

          {/* Isochronic Depth (AM) */}
          <div className="custom-control">
            <div className="control-label">
              <span style={{ color: '#00ff88', fontWeight: 600 }}>Isochronic Pulse</span>
              <span className="val-badge" style={{ color: '#00ff88', border: '1px solid #00ff88' }}>{isoDepth}% Depth</span>
            </div>
            <div className="slider-track-wrapper">
              <input 
                type="range" min="0" max="100" value={isoDepth}
                onChange={(e) => handleIsoParamChange(isoRate, parseInt(e.target.value))}
                className="slider-input"
              />
              <div className="slider-track">
                <motion.div animate={{ width: `${isoDepth}%` }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="slider-fill" style={{ background: 'linear-gradient(90deg, #008855, #00ff88)', boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)' }} />
                <motion.div animate={{ left: `${isoDepth}%` }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="slider-thumb" />
              </div>
            </div>
          </div>

          {/* Isochronic Rate */}
          <div className="custom-control">
            <div className="control-label">
              <span style={{ color: '#00ff88', fontWeight: 600 }}>Pulse Rate (Target State)</span>
              <span className="val-badge" style={{ color: '#00ff88', border: '1px solid #00ff88' }}>{isoRate} Hz</span>
            </div>
            <div className="slider-track-wrapper">
              <input 
                type="range" min="0.5" max="30" step="0.1" value={isoRate}
                onChange={(e) => handleIsoParamChange(parseFloat(e.target.value), isoDepth)}
                className="slider-input"
              />
              <div className="slider-track">
                <motion.div animate={{ width: `${(isoRate / 30) * 100}%` }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="slider-fill" style={{ background: 'linear-gradient(90deg, #008855, #00ff88)', boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)' }} />
                <motion.div animate={{ left: `${(isoRate / 30) * 100}%` }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="slider-thumb" />
              </div>
            </div>
          </div>

        </div>
      </motion.div>
    </section>
  );
}
