import { useRef, useState, useCallback, useEffect } from 'react';

export type FrequencyChannel = '174 Hz' | '396 Hz' | '432 Hz' | '528 Hz' | '852 Hz' | '963 Hz' | 'Alpha' | 'Theta' | 'Custom' | 'Vinyl' | 'Void' | 'Rain' | 'White';

export interface EngineOptions {
  isPremium?: boolean;
  onCutoff?: () => void;
}

export function useAudioEngine(options?: EngineOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Initialize timer from localStorage
  const initialTime = typeof window !== 'undefined' ? parseInt(localStorage.getItem('kinesus_free_trial_time') || '0', 10) : 0;
  
  const [elapsedTime, setElapsedTime] = useState(initialTime);
  const cutoffTimerRef = useRef<number | null>(null);
  const playbackTimeRef = useRef<number>(initialTime);
  const CUTOFF_SECONDS = 120;
  
  useEffect(() => {
    if (options?.isPremium) {
      if (cutoffTimerRef.current) window.clearInterval(cutoffTimerRef.current);
      return;
    }

    if (isPlaying) {
      cutoffTimerRef.current = window.setInterval(() => {
        playbackTimeRef.current += 1;
        setElapsedTime(playbackTimeRef.current);
        localStorage.setItem('kinesus_free_trial_time', playbackTimeRef.current.toString());
        
        if (playbackTimeRef.current >= CUTOFF_SECONDS) {
          if (audioCtxRef.current) {
            audioCtxRef.current.suspend();
          }
          setIsPlaying(false);
          if (options?.onCutoff) {
            options.onCutoff();
          }
          if (cutoffTimerRef.current) window.clearInterval(cutoffTimerRef.current);
        }
      }, 1000);
    } else {
      if (cutoffTimerRef.current) window.clearInterval(cutoffTimerRef.current);
    }

    return () => {
      if (cutoffTimerRef.current) window.clearInterval(cutoffTimerRef.current);
    };
  }, [isPlaying, options?.isPremium, options?.onCutoff]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const channelGainsRef = useRef<Record<string, GainNode>>({});
  const channelVolumesRef = useRef<Record<string, number>>({});
  const customLeftOscRef = useRef<OscillatorNode | null>(null);
  const customRightOscRef = useRef<OscillatorNode | null>(null);
  const customLFOOscRef = useRef<OscillatorNode | null>(null);
  const customLFODepthRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  const initEngine = useCallback(() => {
    if (audioCtxRef.current) return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.connect(ctx.destination);
    analyserRef.current = analyser;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.knee.value = 10;
    compressor.ratio.value = 12; 
    compressor.attack.value = 0.003; 
    compressor.release.value = 0.25;
    compressor.connect(analyser);

    // Recording Setup
    const destNode = ctx.createMediaStreamDestination();
    compressor.connect(destNode);
    
    try {
      const mediaRecorder = new MediaRecorder(destNode.stream, { mimeType: 'audio/webm' });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `kinesus-session-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
      };
      mediaRecorderRef.current = mediaRecorder;
    } catch (err) {
      console.warn("MediaRecorder API not supported for this context", err);
    }

    const masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(compressor);
    masterGainRef.current = masterGain;

    const createSolfeggio = (freq: number, key: string) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0; 
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      channelGainsRef.current[key] = gain;
    };

    const createBinaural = (baseFreq: number, offsetFreq: number, key: string, isCustom = false) => {
      const mainChannelGain = ctx.createGain();
      mainChannelGain.gain.value = 0; 
      mainChannelGain.connect(masterGain);
      
      const leftOsc = ctx.createOscillator();
      const rightOsc = ctx.createOscillator();
      
      const leftPanner = ctx.createStereoPanner();
      const rightPanner = ctx.createStereoPanner();
      leftPanner.pan.value = -1; 
      rightPanner.pan.value = 1;  
      
      leftOsc.frequency.value = baseFreq;
      rightOsc.frequency.value = baseFreq + offsetFreq; 
      
      leftOsc.connect(leftPanner);
      rightOsc.connect(rightPanner);
      leftPanner.connect(mainChannelGain);
      rightPanner.connect(mainChannelGain);
      leftOsc.start();
      rightOsc.start();
      
      channelGainsRef.current[key] = mainChannelGain;
      
      if (isCustom) {
        customLeftOscRef.current = leftOsc;
        customRightOscRef.current = rightOsc;
        
        const amDepthNode = ctx.createGain();
        amDepthNode.gain.value = 0; 
        const amLFO = ctx.createOscillator();
        amLFO.type = 'sine';
        amLFO.frequency.value = 0; 
        amLFO.connect(amDepthNode);
        amDepthNode.connect(mainChannelGain.gain); 
        amLFO.start();
        
        customLFOOscRef.current = amLFO;
        customLFODepthRef.current = amDepthNode;
      }
    };

    const createVinylNoise = () => {
      const bufferSize = ctx.sampleRate * 2; 
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        let noise = Math.random() * 2 - 1;
        if (Math.random() < 0.001) noise *= 15; 
        data[i] = noise * 0.05; 
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1200; 
      const gain = ctx.createGain();
      gain.gain.value = 0;
      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      noiseSource.start();
      channelGainsRef.current['Vinyl'] = gain;
    };

    const createAmbientNoise = (type: 'brown' | 'pink' | 'white', key: string) => {
      const bufferSize = ctx.sampleRate * 2; 
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        let whiteRaw = Math.random() * 2 - 1;
        if (type === 'brown') {
            // Brown noise approximation (integrating white noise)
            lastOut = (lastOut + (0.02 * whiteRaw)) / 1.02;     
            data[i] = lastOut * 3.5; 
        } else if (type === 'pink') {
            // Pink noise approximation
            lastOut = (lastOut * 0.9) + (0.1 * whiteRaw);
            data[i] = lastOut * 2.0; 
        } else {
            // White noise
            data[i] = whiteRaw * 0.3;
        }
      }
      
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;
      const filter = ctx.createBiquadFilter();

      if (type === 'white') {
        filter.type = 'highshelf';
        filter.frequency.value = 6000;
        filter.gain.value = -12; // De-harsh high frequencies
      } else {
        filter.type = 'lowpass';
        filter.frequency.value = type === 'brown' ? 250 : 800;
      }
      
      const gain = ctx.createGain();
      gain.gain.value = 0;
      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      noiseSource.start();
      channelGainsRef.current[key] = gain;
    };

    createSolfeggio(174, '174 Hz');
    createSolfeggio(396, '396 Hz');
    createSolfeggio(432, '432 Hz');
    createSolfeggio(528, '528 Hz');
    createSolfeggio(852, '852 Hz');
    createSolfeggio(963, '963 Hz');
    createBinaural(200, 10, 'Alpha');
    createBinaural(160, 6, 'Theta');
    createBinaural(432, 0, 'Custom', true);
    createVinylNoise();
    createAmbientNoise('brown', 'Void');
    createAmbientNoise('pink', 'Rain');
    createAmbientNoise('white', 'White');
    
    ctx.suspend();
  }, []);

  const togglePlay = useCallback(async () => {
    if (!audioCtxRef.current) initEngine();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (isPlaying) {
      await ctx.suspend();
      setIsPlaying(false);
    } else {
      await ctx.resume();
      setIsPlaying(true);
    }
  }, [isPlaying, initEngine]);

  const setVolume = useCallback((channel: FrequencyChannel, value: number) => {
    if (!audioCtxRef.current) initEngine();
    const gainNode = channelGainsRef.current[channel];
    const ctx = audioCtxRef.current;
    if (gainNode && ctx) {
      // Adjusted multipliers based on buffer amplitude constraints
      let multiplier = 0.3;
      if (channel === 'Vinyl') multiplier = 0.6;
      if (channel === 'Void') multiplier = 0.8; 
      if (channel === 'Rain') multiplier = 0.5;
      if (channel === 'White') multiplier = 0.4;

      const normalize = Math.max((value / 100) * multiplier, 0.0001); 
      channelVolumesRef.current[channel] = normalize;
      gainNode.gain.cancelScheduledValues(ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(normalize, ctx.currentTime + 0.1);
    }
  }, [initEngine]);

  const updateCustomNode = useCallback((baseFreq: number, offsetFreq: number, type: OscillatorType) => {
    if (!audioCtxRef.current) initEngine();
    const ctx = audioCtxRef.current;
    const lOsc = customLeftOscRef.current;
    const rOsc = customRightOscRef.current;
    if (ctx && lOsc && rOsc) {
      lOsc.type = type;
      rOsc.type = type;
      lOsc.frequency.setTargetAtTime(baseFreq, ctx.currentTime, 0.05);
      rOsc.frequency.setTargetAtTime(baseFreq + offsetFreq, ctx.currentTime, 0.05);
    }
  }, [initEngine]);

  const updateIsochronic = useCallback((rateHz: number, depthPct: number) => {
    if (!audioCtxRef.current) initEngine();
    const ctx = audioCtxRef.current;
    const lfo = customLFOOscRef.current;
    const depth = customLFODepthRef.current;
    const customBaseNode = channelGainsRef.current['Custom'];

    if (ctx && lfo && depth && customBaseNode) {
        lfo.frequency.setTargetAtTime(rateHz, ctx.currentTime, 0.05);
        const maxDepthAmplitude = Math.max(customBaseNode.gain.value * (depthPct / 100), 0.0001);
        depth.gain.setTargetAtTime(maxDepthAmplitude, ctx.currentTime, 0.05);
    }
  }, [initEngine]);

  const startRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
      recordedChunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const getAnalyser = useCallback(() => {
    return analyserRef.current;
  }, []);

  const [isWashing, setIsWashing] = useState(false);

  const triggerSweep = useCallback(async (startFreq: number, durationSeconds: number) => {
    if (!options?.isPremium && playbackTimeRef.current >= CUTOFF_SECONDS) {
      if (options?.onCutoff) options.onCutoff();
      return;
    }

    if (isWashing) return; // Prevent overlapping washes
    
    if (!audioCtxRef.current) initEngine();
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current) return;

    const now = ctx.currentTime;

    const wasSuspended = ctx.state === 'suspended';

    if (wasSuspended) {
      await ctx.resume();
      setIsPlaying(true);
      // Unmute master gain if it was paused
      masterGainRef.current.gain.cancelScheduledValues(now);
      masterGainRef.current.gain.setValueAtTime(0, now);
      masterGainRef.current.gain.linearRampToValueAtTime(1, now + 0.1);
    }

    setIsWashing(true);

    // Fade out background presets completely to create a clean sonic canvas, then fade them back in later
    Object.keys(channelGainsRef.current).forEach(key => {
        const gainNode = channelGainsRef.current[key];
        const currentVol = channelVolumesRef.current[key] || 0;
        if (currentVol > 0.0001) {
            gainNode.gain.cancelScheduledValues(now);
            
            if (wasSuspended) {
                // If it was paused, instantly mute to prevent a blip when master gain unmutes
                gainNode.gain.setValueAtTime(0.0001, now);
            } else {
                // If it was already playing, fade it out smoothly
                gainNode.gain.setValueAtTime(currentVol, now);
                gainNode.gain.linearRampToValueAtTime(0.0001, now + 1.0);
            }
            
            if (!wasSuspended) {
                // Restore volume after the wash finishes
                gainNode.gain.setValueAtTime(0.0001, now + durationSeconds);
                gainNode.gain.linearRampToValueAtTime(currentVol, now + durationSeconds + 3.0);
            }
        }
    });

    // Master gain for the wash
    const washMasterGain = ctx.createGain();
    washMasterGain.gain.value = 0.01;
    washMasterGain.gain.exponentialRampToValueAtTime(1.0, now + 2); // Slow swell in
    washMasterGain.gain.setValueAtTime(1.0, now + durationSeconds - 5);
    washMasterGain.gain.linearRampToValueAtTime(0.0001, now + durationSeconds);
    
    washMasterGain.connect(masterGainRef.current);

    // The Submersion Filter (Low-pass sweeping down)
    const submersionFilter = ctx.createBiquadFilter();
    submersionFilter.type = 'lowpass';
    submersionFilter.frequency.setValueAtTime(4000, now);
    submersionFilter.frequency.exponentialRampToValueAtTime(100, now + durationSeconds); // Drops into a warm, muffled hum
    submersionFilter.Q.value = 1.5; // Slight resonance for a physical "sweeping" feel
    
    // Stereo Expander
    const stereoPanner = ctx.createStereoPanner();
    stereoPanner.pan.setValueAtTime(0, now); // Start in center
    // LFO to slowly rock back and forth while expanding
    const panLFO = ctx.createOscillator();
    panLFO.type = 'sine';
    panLFO.frequency.value = 0.1; // Very slow pan
    
    const panDepth = ctx.createGain();
    panDepth.gain.setValueAtTime(0, now);
    panDepth.gain.linearRampToValueAtTime(0.8, now + (durationSeconds / 2)); // Pan gets wider as it drops
    
    panLFO.connect(panDepth);
    panDepth.connect(stereoPanner.pan);
    panLFO.start(now);
    panLFO.stop(now + durationSeconds);

    submersionFilter.connect(stereoPanner);
    stereoPanner.connect(washMasterGain);

    // 1. Golden Ratio Harmonics (Perfect 5ths and Octaves)
    // Root, Fifth (1.5x), Octave (2x), Major Third (1.25x) of startFreq (usually 432)
    const harmonics = [1, 1.25, 1.5, 2];
    
    harmonics.forEach((multiplier, index) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(startFreq * multiplier, now);
        
        // Add a very slight detune to the higher harmonics for thick, glowing chorus
        if (index > 0) {
           const detuneOsc = ctx.createOscillator();
           detuneOsc.type = 'sine';
           detuneOsc.frequency.setValueAtTime((startFreq * multiplier) + (index * 1.5), now);
           
           const dGain = ctx.createGain();
           dGain.gain.value = 0.15;
           detuneOsc.connect(dGain);
           dGain.connect(submersionFilter);
           detuneOsc.start(now);
           detuneOsc.stop(now + durationSeconds);
        }

        const oscGain = ctx.createGain();
        oscGain.gain.value = index === 0 ? 0.3 : 0.15; // Root is strongest
        
        osc.connect(oscGain);
        oscGain.connect(submersionFilter);
        
        osc.start(now);
        osc.stop(now + durationSeconds);
    });

    // 2. The ASMR Ocean Wave (Pink Noise Wash)
    const bufferSize = ctx.sampleRate * 2; 
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        let whiteRaw = Math.random() * 2 - 1;
        lastOut = (lastOut * 0.9) + (0.1 * whiteRaw);
        data[i] = lastOut * 2.0; 
    }
    
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;
    
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2000, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(200, now + durationSeconds);
    noiseFilter.Q.value = 0.5;

    const noiseGain = ctx.createGain();
    // Simulate an ocean wave crashing and receding
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.08, now + 3);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + durationSeconds);
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(stereoPanner); // Panned with the chord
    
    noiseSource.start(now);
    noiseSource.stop(now + durationSeconds);

    // Cleanup
    setTimeout(() => {
        setIsWashing(false);
        washMasterGain.disconnect();
        submersionFilter.disconnect();
        stereoPanner.disconnect();
        
        if (wasSuspended) {
            ctx.suspend();
            setIsPlaying(false);
            masterGainRef.current?.gain.setValueAtTime(0, ctx.currentTime);
        }
    }, (durationSeconds + 1) * 1000);
  }, [initEngine, isWashing]);

  return { isPlaying, isWashing, togglePlay, elapsedTime, setVolume, updateCustomNode, updateIsochronic, initEngine, getAnalyser, isRecording, startRecording, stopRecording, triggerSweep };
}
