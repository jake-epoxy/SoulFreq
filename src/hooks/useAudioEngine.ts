import { useRef, useState, useCallback } from 'react';

export type FrequencyChannel = '174 Hz' | '396 Hz' | '432 Hz' | '528 Hz' | '852 Hz' | '963 Hz' | 'Alpha' | 'Theta' | 'Custom' | 'Vinyl' | 'Void' | 'Rain' | 'White';

export function useAudioEngine() {
  const [isPlaying, setIsPlaying] = useState(false);
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

  const triggerSweep = useCallback((startFreq: number, endFreq: number, durationSeconds: number) => {
    if (!audioCtxRef.current) initEngine();
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current) return;

    // Master gain for the entire sweep effect
    const sweepMasterGain = ctx.createGain();
    sweepMasterGain.gain.value = 0.01;
    // Fade in over 100ms to prevent clicking
    sweepMasterGain.gain.exponentialRampToValueAtTime(1.0, ctx.currentTime + 0.1);
    // Fade out smoothly at the end
    sweepMasterGain.gain.setValueAtTime(1.0, ctx.currentTime + durationSeconds - 2);
    sweepMasterGain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + durationSeconds);
    
    // Add a Theta (4Hz) Tremolo to the whole drop for visceral "throbbing"
    const tremoloGain = ctx.createGain();
    tremoloGain.gain.value = 0.8; 
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 4; // 4Hz
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.2; // 20% volume modulation
    lfo.connect(lfoGain);
    lfoGain.connect(tremoloGain.gain);
    lfo.start(ctx.currentTime);
    lfo.stop(ctx.currentTime + durationSeconds);

    sweepMasterGain.connect(tremoloGain);
    tremoloGain.connect(masterGainRef.current);

    const now = ctx.currentTime;
    const centerFreq = 400; // Peak volume frequency for the Shepard envelope
    const bellWidth = 2.0; // Width of the frequency bell curve
    
    // 7 Octaves spanning deep sub-bass to high treble
    for (let i = -3; i <= 3; i++) {
        const octaveMultiplier = Math.pow(2, i);
        const f_start = startFreq * octaveMultiplier;
        const f_end = endFreq * octaveMultiplier;
        
        // 1. Primary Oscillator (Sawtooth for richness and "grit")
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f_start, now);
        osc.frequency.exponentialRampToValueAtTime(f_end, now + durationSeconds);
        
        // 2. Sub-oscillator (Sine) exactly one octave below for pure bass weight
        const subOsc = ctx.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(f_start / 2, now);
        subOsc.frequency.exponentialRampToValueAtTime(f_end / 2, now + durationSeconds);

        // 3. Lowpass Filter to warm up the sawtooth and make it sound massive
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 1.0; 
        filter.frequency.setValueAtTime(f_start * 1.5, now);
        filter.frequency.exponentialRampToValueAtTime(f_end * 1.5, now + durationSeconds);
        
        // 4. Gain Node for the Gaussian Envelope (The Shepard Illusion)
        const gainNode = ctx.createGain();
        
        // Calculate the volume curve based on frequency passing through the center
        const curveLength = 100;
        const volCurve = new Float32Array(curveLength);
        for(let j=0; j<curveLength; j++) {
            const t = j / (curveLength - 1);
            const currentFreq = f_start * Math.pow(f_end / f_start, t);
            const octavesFromCenter = Math.log2(currentFreq / centerFreq);
            // Gaussian bell curve
            const amplitude = Math.exp(-(octavesFromCenter * octavesFromCenter) / (2 * bellWidth * bellWidth));
            volCurve[j] = amplitude * 0.12; // Normalize to prevent clipping across 7 octaves
        }
        
        gainNode.gain.setValueCurveAtTime(volCurve, now, durationSeconds);
        
        // 5. Spatial Panning to widen the higher octaves around the listener's head
        const panner = ctx.createStereoPanner();
        const panValue = i === 0 ? 0 : (i % 2 === 0 ? 0.6 : -0.6) * (Math.abs(i)/3);
        panner.pan.value = panValue;

        // Connections
        osc.connect(filter);
        subOsc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(panner);
        panner.connect(sweepMasterGain);
        
        osc.start(now);
        subOsc.start(now);
        osc.stop(now + durationSeconds);
        subOsc.stop(now + durationSeconds);
        
        // Cleanup memory
        osc.onended = () => {
            osc.disconnect();
            subOsc.disconnect();
            filter.disconnect();
            gainNode.disconnect();
            panner.disconnect();
            if (i === 3) {
                sweepMasterGain.disconnect();
                tremoloGain.disconnect();
                lfoGain.disconnect();
                lfo.disconnect();
            }
        };
    }
  }, [initEngine]);

  return { isPlaying, togglePlay, setVolume, updateCustomNode, updateIsochronic, initEngine, getAnalyser, isRecording, startRecording, stopRecording, triggerSweep };
}
