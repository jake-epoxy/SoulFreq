import { useRef, useState, useCallback, useEffect } from 'react';

export type FrequencyChannel = '174 Hz' | '396 Hz' | '432 Hz' | '528 Hz' | '852 Hz' | '963 Hz' | 'Alpha' | 'Theta' | 'Custom' | 'Vinyl' | 'Void' | 'Rain' | 'White' | 'Liquid' | 'Ascender' | 'Euphoric' | 'Crystal';

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

    const createContinuousLiquid = () => {
        const gain = ctx.createGain();
        gain.gain.value = 0;
        gain.connect(masterGain);
        
        const curve = new Float32Array(4096);
        for (let i = 0; i < 4096; ++i) {
            const x = (i * 2) / 4096 - 1;
            curve[i] = Math.sin(x * Math.PI * 4);
        }
        const shaper = ctx.createWaveShaper();
        shaper.curve = curve;
        shaper.oversample = '4x';
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 400;
        filter.Q.value = 5.0; 
        
        const filterLfo = ctx.createOscillator();
        filterLfo.frequency.value = 0.05; 
        const filterLfoGain = ctx.createGain();
        filterLfoGain.gain.value = 800; 
        filterLfo.connect(filterLfoGain);
        filterLfoGain.connect(filter.frequency);
        filterLfo.start();

        const panner = ctx.createStereoPanner();
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.5;
        lfo.connect(panner.pan);
        lfo.start();

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = 110;
        
        const oscGain = ctx.createGain();
        oscGain.gain.value = 0.3;
        
        osc.connect(oscGain);
        oscGain.connect(shaper);
        shaper.connect(filter);
        filter.connect(panner);
        panner.connect(gain);
        
        osc.start();
        channelGainsRef.current['Liquid'] = gain;
    };

    const createContinuousAscender = () => {
        const gain = ctx.createGain();
        gain.gain.value = 0;
        gain.connect(masterGain);

        const numOscs = 6;
        const baseFreq = 55;
        const ascenderGain = ctx.createGain();
        ascenderGain.gain.value = 0.3;
        ascenderGain.connect(gain);
        
        for (let i = 0; i < numOscs; i++) {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            const oscVol = ctx.createGain();
            
            osc.connect(oscVol);
            oscVol.connect(ascenderGain);
            osc.start();

            const lfo = ctx.createOscillator();
            lfo.type = 'sawtooth';
            lfo.frequency.value = 0.05; 
            const lfoGain = ctx.createGain();
            lfoGain.gain.value = baseFreq * Math.pow(2, i); 
            
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            
            osc.frequency.value = baseFreq * Math.pow(2, i) * 1.5;
            
            const amLfo = ctx.createOscillator();
            amLfo.type = 'sine';
            amLfo.frequency.value = 0.05; 
            const amGain = ctx.createGain();
            amGain.gain.value = 0.5;
            amLfo.connect(amGain);
            amGain.connect(oscVol.gain);
            oscVol.gain.value = 0.5; 

            lfo.start();
            amLfo.start();
        }
        channelGainsRef.current['Ascender'] = gain;
    };

    const createContinuousEuphoric = () => {
        const gain = ctx.createGain();
        gain.gain.value = 0;
        gain.connect(masterGain);

        const submersionFilter = ctx.createBiquadFilter();
        submersionFilter.type = 'lowpass';
        submersionFilter.frequency.value = 2000;
        submersionFilter.Q.value = 1.5;

        const filterLfo = ctx.createOscillator();
        filterLfo.frequency.value = 0.02; 
        const filterLfoGain = ctx.createGain();
        filterLfoGain.gain.value = 1500; 
        filterLfo.connect(filterLfoGain);
        filterLfoGain.connect(submersionFilter.frequency);
        filterLfo.start();
        
        const stereoPanner = ctx.createStereoPanner();
        const panLFO = ctx.createOscillator();
        panLFO.type = 'sine';
        panLFO.frequency.value = 0.1;
        const panDepth = ctx.createGain();
        panDepth.gain.value = 0.6;
        panLFO.connect(panDepth);
        panDepth.connect(stereoPanner.pan);
        panLFO.start();

        submersionFilter.connect(stereoPanner);
        stereoPanner.connect(gain);

        const baseFreq = 216; 
        const harmonics = [1, 1.25, 1.5, 2];
        harmonics.forEach((multiplier, index) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = baseFreq * multiplier;
            if (index > 0) {
               const detuneOsc = ctx.createOscillator();
               detuneOsc.type = 'sine';
               detuneOsc.frequency.value = (baseFreq * multiplier) + (index * 1.5);
               const dGain = ctx.createGain();
               dGain.gain.value = 0.15;
               detuneOsc.connect(dGain);
               dGain.connect(submersionFilter);
               detuneOsc.start();
            }
            const oscGain = ctx.createGain();
            oscGain.gain.value = index === 0 ? 0.3 : 0.15;
            osc.connect(oscGain);
            oscGain.connect(submersionFilter);
            osc.start();
        });

        channelGainsRef.current['Euphoric'] = gain;
    };

    const createContinuousCrystal = () => {
        const gain = ctx.createGain();
        gain.gain.value = 0;
        gain.connect(masterGain);

        const carrier = ctx.createOscillator();
        carrier.type = 'sine';
        carrier.frequency.value = 2000;

        const modulator = ctx.createOscillator();
        modulator.type = 'sine';
        modulator.frequency.value = 2010; 

        const modGain = ctx.createGain();
        modGain.gain.value = 500; 

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;

        const panner = ctx.createStereoPanner();
        const panLfo = ctx.createOscillator();
        panLfo.type = 'sine';
        panLfo.frequency.value = 0.2;
        panLfo.connect(panner.pan);
        panLfo.start();

        const outGain = ctx.createGain();
        outGain.gain.value = 0.08; 

        carrier.connect(filter);
        filter.connect(panner);
        panner.connect(outGain);
        outGain.connect(gain);

        carrier.start();
        modulator.start();

        channelGainsRef.current['Crystal'] = gain;
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
    
    createContinuousLiquid();
    createContinuousAscender();
    createContinuousEuphoric();
    createContinuousCrystal();
    
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Kinetic Protocol',
        artist: 'Kinesus',
        album: 'Somatic Mastery',
        artwork: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', async () => {
        if (audioCtxRef.current) {
          await audioCtxRef.current.resume();
          setIsPlaying(true);
        }
      });

      navigator.mediaSession.setActionHandler('pause', async () => {
        if (audioCtxRef.current) {
          await audioCtxRef.current.suspend();
          setIsPlaying(false);
        }
      });
    }
    
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

  const triggerSweep = useCallback(async (durationSeconds: number) => {
    if (!options?.isPremium && playbackTimeRef.current >= CUTOFF_SECONDS) {
      if (options?.onCutoff) options.onCutoff();
      return;
    }

    if (isWashing) return; 
    
    if (!audioCtxRef.current) initEngine();
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current) return;

    const now = ctx.currentTime;
    const wasSuspended = ctx.state === 'suspended';

    if (wasSuspended) {
      await ctx.resume();
      setIsPlaying(true);
      masterGainRef.current.gain.cancelScheduledValues(now);
      masterGainRef.current.gain.setValueAtTime(0, now);
      masterGainRef.current.gain.linearRampToValueAtTime(1, now + 0.1);
    }

    setIsWashing(true);

    Object.keys(channelGainsRef.current).forEach(key => {
        const gainNode = channelGainsRef.current[key];
        const currentVol = channelVolumesRef.current[key] || 0;
        if (currentVol > 0.0001) {
            gainNode.gain.cancelScheduledValues(now);
            if (wasSuspended) {
                gainNode.gain.setValueAtTime(0.0001, now);
            } else {
                gainNode.gain.setValueAtTime(currentVol, now);
                gainNode.gain.linearRampToValueAtTime(0.0001, now + 1.0);
            }
            if (!wasSuspended) {
                gainNode.gain.setValueAtTime(0.0001, now + durationSeconds);
                gainNode.gain.linearRampToValueAtTime(currentVol, now + durationSeconds + 3.0);
            }
        }
    });

    const washMasterGain = ctx.createGain();
    washMasterGain.gain.value = 0.01;
    washMasterGain.connect(masterGainRef.current);
    
    const activeNodes: any[] = [];

    washMasterGain.gain.setValueAtTime(1.0, now); 
    
    const flashbangDuration = 5; 
    
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for(let i=0; i<noiseBuffer.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    
    const swellGain = ctx.createGain();
    swellGain.gain.setValueAtTime(0.0001, now);
    swellGain.gain.exponentialRampToValueAtTime(2.0, now + flashbangDuration); 
    swellGain.gain.setValueAtTime(0.0001, now + flashbangDuration + 0.05); 
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(4000, now + flashbangDuration);
    
    noise.connect(filter);
    filter.connect(swellGain);
    swellGain.connect(washMasterGain);
    noise.start(now);
    noise.stop(now + durationSeconds);
    activeNodes.push(noise, filter, swellGain);

    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(40, now);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.setValueAtTime(0.0001, now + flashbangDuration); 
    subGain.gain.linearRampToValueAtTime(1.0, now + flashbangDuration + 0.1); 
    subGain.gain.linearRampToValueAtTime(0.0001, now + durationSeconds); 
    
    subOsc.connect(subGain);
    subGain.connect(washMasterGain);
    subOsc.start(now);
    subOsc.stop(now + durationSeconds);
    activeNodes.push(subOsc, subGain);

    // Cleanup
    setTimeout(() => {
        setIsWashing(false);
        activeNodes.forEach(node => {
            try { node.disconnect(); } catch(e) {}
        });
        washMasterGain.disconnect();
        
        if (wasSuspended) {
            ctx.suspend();
            setIsPlaying(false);
            masterGainRef.current?.gain.setValueAtTime(0, ctx.currentTime);
        }
    }, (durationSeconds + 1) * 1000);
  }, [initEngine, isWashing]);

  return { isPlaying, isWashing, togglePlay, elapsedTime, setVolume, updateCustomNode, updateIsochronic, initEngine, getAnalyser, isRecording, startRecording, stopRecording, triggerSweep };
}
