import { useRef, useState, useCallback, useEffect } from 'react';

export type FrequencyChannel = '174 Hz' | '396 Hz' | '432 Hz' | '528 Hz' | '852 Hz' | '963 Hz' | 'Alpha' | 'Theta' | 'Custom' | 'Vinyl' | 'Void' | 'Rain' | 'White';

export interface EngineOptions {
  isPremium?: boolean;
  onCutoff?: () => void;
}

export function useAudioEngine(options?: EngineOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const cutoffTimerRef = useRef<number | null>(null);
  const playbackTimeRef = useRef<number>(0);
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

  const triggerSweep = useCallback(async (startFreq: number, endFreq: number, durationSeconds: number) => {
    if (!options?.isPremium && playbackTimeRef.current >= CUTOFF_SECONDS) {
      if (options?.onCutoff) options.onCutoff();
      return;
    }

    if (!audioCtxRef.current) initEngine();
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current) return;

    // Ensure the audio context is active so the drop plays immediately
    if (ctx.state === 'suspended') {
      await ctx.resume();
      setIsPlaying(true);
    }

    const now = ctx.currentTime;

    // Fade out background presets completely and keep them off (The drop resets the sonic environment)
    Object.values(channelGainsRef.current).forEach(gainNode => {
        const currentVol = gainNode.gain.value;
        if (currentVol > 0.0001) {
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(currentVol, now);
            gainNode.gain.linearRampToValueAtTime(0.0001, now + 1.0);
        }
    });

    // Master gain for the entire sweep effect
    const sweepMasterGain = ctx.createGain();
    sweepMasterGain.gain.value = 0.01;
    // Fade in over 100ms to prevent clicking
    sweepMasterGain.gain.exponentialRampToValueAtTime(1.0, now + 0.1);
    // Fade out smoothly at the end
    sweepMasterGain.gain.setValueAtTime(1.0, now + durationSeconds - 2);
    sweepMasterGain.gain.linearRampToValueAtTime(0.01, now + durationSeconds);
    
    sweepMasterGain.connect(masterGainRef.current);

    // Massive Cavernous Delay Network
    const delayL = ctx.createDelay();
    delayL.delayTime.value = 0.4; // 400ms delay
    const delayR = ctx.createDelay();
    delayR.delayTime.value = 0.6; // 600ms delay
    
    const feedbackL = ctx.createGain();
    feedbackL.gain.value = 0.4; 
    const feedbackR = ctx.createGain();
    feedbackR.gain.value = 0.4;

    const panL = ctx.createStereoPanner();
    panL.pan.value = -0.8;
    const panR = ctx.createStereoPanner();
    panR.pan.value = 0.8;

    delayL.connect(feedbackL);
    feedbackL.connect(delayL);
    delayL.connect(panL);
    
    delayR.connect(feedbackR);
    feedbackR.connect(delayR);
    delayR.connect(panR);
    
    panL.connect(sweepMasterGain);
    panR.connect(sweepMasterGain);

    const centerFreq = 1600; 
    const bellWidth = 2.0; 
    
    // 4 Octaves for a focused, pure ringing effect
    for (let i = 0; i <= 3; i++) {
        const octaveMultiplier = Math.pow(2, i);
        const f_start = startFreq * octaveMultiplier;
        const f_end = endFreq * octaveMultiplier;
        
        // Pure ringing Sine
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(f_start, now);
        osc1.frequency.exponentialRampToValueAtTime(f_end, now + durationSeconds);
        
        // Gentle Triangle for physical resonance, detuned slowly (2Hz) for majestic swirl
        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(f_start + 2, now);
        osc2.frequency.exponentialRampToValueAtTime(f_end + 2, now + durationSeconds);

        const gainNode = ctx.createGain();
        
        const curveLength = 100;
        const volCurve = new Float32Array(curveLength);
        for(let j=0; j<curveLength; j++) {
            const t = j / (curveLength - 1);
            const currentFreq = f_start * Math.pow(f_end / f_start, t);
            const octavesFromCenter = Math.log2(currentFreq / centerFreq);
            const amplitude = Math.exp(-(octavesFromCenter * octavesFromCenter) / (2 * bellWidth * bellWidth));
            volCurve[j] = amplitude * 0.15; 
        }
        
        gainNode.gain.setValueCurveAtTime(volCurve, now, durationSeconds);
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        
        gainNode.connect(sweepMasterGain); // Dry signal
        gainNode.connect(delayL); // Wet L
        gainNode.connect(delayR); // Wet R
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + durationSeconds);
        osc2.stop(now + durationSeconds);
        
        // Cleanup memory
        osc1.onended = () => {
            osc1.disconnect();
            osc2.disconnect();
            gainNode.disconnect();
            if (i === 3) {
                delayL.disconnect();
                delayR.disconnect();
                feedbackL.disconnect();
                feedbackR.disconnect();
                panL.disconnect();
                panR.disconnect();
                sweepMasterGain.disconnect();
            }
        };
    }
  }, [initEngine]);

  return { isPlaying, togglePlay, elapsedTime, setVolume, updateCustomNode, updateIsochronic, initEngine, getAnalyser, isRecording, startRecording, stopRecording, triggerSweep };
}
