import { useRef, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type FrequencyChannel = '174 Hz' | '396 Hz' | '432 Hz' | '528 Hz' | '852 Hz' | '963 Hz' | 'Alpha' | 'Theta' | 'Custom' | 'Vinyl' | 'Void' | 'Rain' | 'White' | 'Liquid' | 'Ascender' | 'Euphoric' | 'Crystal';

export interface EngineOptions {
  isPremium?: boolean;
  onCutoff?: () => void;
}

export function useAudioEngine(options?: EngineOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  
  // Keep ref in sync with state
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  
  // Initialize timer from localStorage
  const initialTime = typeof window !== 'undefined' ? parseInt(localStorage.getItem('kinesus_free_trial_time') || '0', 10) : 0;
  
  const [elapsedTime, setElapsedTime] = useState(initialTime);
  const cutoffTimerRef = useRef<number | null>(null);
  const playbackTimeRef = useRef<number>(initialTime);
  const CUTOFF_SECONDS = 120;

  const sessionStartTimeRef = useRef<number | null>(null);

  const logSessionToSupabase = async (durationSeconds: number) => {
    if (durationSeconds < 10) return; 
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase.from('user_sessions').insert({
        user_id: user.id,
        duration_seconds: durationSeconds
      });
    } catch (e) {
      console.error("Failed to log session", e);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      sessionStartTimeRef.current = Date.now();
    } else {
      if (sessionStartTimeRef.current) {
        const durationSeconds = Math.round((Date.now() - sessionStartTimeRef.current) / 1000);
        logSessionToSupabase(durationSeconds);
        sessionStartTimeRef.current = null;
      }
    }
  }, [isPlaying]);
  
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    // eslint-disable-next-line react-hooks/immutability
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
      // Find a supported MIME type
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) { selectedMime = mime; break; }
      }
      
      const recorderOptions = selectedMime ? { mimeType: selectedMime } : {};
      const mediaRecorder = new MediaRecorder(destNode.stream, recorderOptions);
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const ext = selectedMime.includes('mp4') ? 'mp4' : selectedMime.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob(recordedChunksRef.current, { type: selectedMime || 'audio/webm' });
        const fileName = `Kinesus-Session-${new Date().toISOString().slice(0,10)}.${ext}`;
        
        // Method 1: Standard anchor download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // Use a brief timeout to ensure DOM is ready
        setTimeout(() => {
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, 1000);
        }, 0);
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
        const whiteRaw = Math.random() * 2 - 1;
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
      // Mute all studio channels via gain (not ctx.suspend, which would kill washes)
      const now = ctx.currentTime;
      Object.keys(channelGainsRef.current).forEach(key => {
        const gainNode = channelGainsRef.current[key];
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.linearRampToValueAtTime(0.0001, now + 0.1);
      });
      // Only fully suspend if no washes are running
      if (activeWashesRef.current.length === 0) {
        await ctx.suspend();
      }
      setIsPlaying(false);
    } else {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      // Restore all studio channel volumes
      const now = ctx.currentTime;
      Object.keys(channelGainsRef.current).forEach(key => {
        const gainNode = channelGainsRef.current[key];
        const savedVol = channelVolumesRef.current[key] || 0;
        if (savedVol > 0.0001) {
          gainNode.gain.cancelScheduledValues(now);
          gainNode.gain.linearRampToValueAtTime(savedVol, now + 0.1);
        }
      });
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
      mediaRecorderRef.current.start(1000); // Capture data every 1s for reliability
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

  const [activeWashTypes, setActiveWashTypes] = useState<string[]>([]);
  const activeWashesRef = useRef<{id: string, type: string, startOffset: number, duration: number, startFreq: number, nodes?: AudioNode[], washMasterGain?: GainNode}[]>([]);

  const getActiveWashData = useCallback(() => {
     if (!audioCtxRef.current || activeWashesRef.current.length === 0) return [];
     
     const now = audioCtxRef.current.currentTime;
     const currentWashes = [];
     
     for (const wash of activeWashesRef.current) {
         const elapsed = now - wash.startOffset;
         const { type, startFreq, id } = wash;
         let displayHz = "";
         
         if (type === 'euphoric') {
             const cycle = (Math.sin(elapsed * Math.PI * 2 / 30) + 1) / 2;
             const currentF = 100 * Math.pow(4000 / 100, cycle);
             displayHz = `${Math.round(currentF)} Hz LPF`;
         } else if (type === 'flashbang') {
             displayHz = "6000 Hz RES";
         } else if (type === 'liquid') {
             const cycle = (Math.sin(elapsed * Math.PI * 2 / 15) + 1) / 2;
             const currentF = 200 * Math.pow(3000 / 200, cycle);
             displayHz = `${Math.round(currentF)} Hz BPF`;
         } else if (type === 'glitch') {
             const popSpeed = (elapsed % 1) < 0.5 ? '16Hz' : '4Hz';
             const freqDisplay = Math.random() > 0.9 ? '852' : '528';
             displayHz = `[${freqDisplay}Hz] AM-${popSpeed}`;
         } else if (type === 'cyber') {
             const poly = Math.random() > 0.5 ? 'SYNC' : 'OFFSET';
             displayHz = `[852Hz] POLY-${poly}`;
         } else if (type === 'bereginya') {
             displayHz = `[432+963Hz] MATRIX-ACTV`;
         } else if (type === 'astral') {
             displayHz = `[${startFreq || 528}Hz] VOID-SWIRL`;
         } else if (type === 'audirall') {
             displayHz = `[40Hz GAMMA] AUDI-RALL`;
         } else if (type === 'ascender') {
             const baseFreq = startFreq / 2;
             const cycle = (elapsed % 30) / 30;
             const currentPitch = baseFreq * Math.pow(4, cycle);
             displayHz = `${Math.round(currentPitch)} Hz Rising`;
         } else if (type === 'descender') {
             const baseFreq = startFreq / 2;
             const cycle = 1 - ((elapsed % 30) / 30);
             const currentPitch = baseFreq * Math.pow(4, cycle);
             displayHz = `${Math.round(currentPitch)} Hz Falling`;
         } else if (type === 'tibetan') {
             const beat = Math.round(2 + Math.sin(elapsed * 0.3) * 1.5);
             displayHz = `[${startFreq || 136}Hz] ${beat}Hz Beat`;
         } else if (type === 'nervetap') {
             const side = Math.sin(elapsed * Math.PI * 2 * 2) > 0 ? 'R' : 'L';
             displayHz = `[BILATERAL] TAP-${side}`;
         }
         
         currentWashes.push({ id, type, elapsed, displayHz });
     }
     
     return currentWashes;
  }, []);

  const toggleWash = useCallback(async (startFreq: number, type: 'euphoric' | 'flashbang' | 'liquid' | 'ascender' | 'glitch' | 'cyber' | 'bereginya' | 'astral' | 'audirall' | 'descender' | 'tibetan' | 'nervetap' = 'euphoric') => {
    if (!options?.isPremium && playbackTimeRef.current >= CUTOFF_SECONDS) {
      if (options?.onCutoff) options.onCutoff();
      return;
    }

    if (!audioCtxRef.current) initEngine();
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current) return;
    const now = ctx.currentTime;

    const existingWashIndex = activeWashesRef.current.findIndex((w) => w.type === type);
    if (existingWashIndex !== -1) {
        const wash = activeWashesRef.current[existingWashIndex];
        wash.washMasterGain?.gain.cancelScheduledValues(now);
        if (wash.washMasterGain) wash.washMasterGain.gain.setValueAtTime(wash.washMasterGain.gain.value, now);
        wash.washMasterGain?.gain.linearRampToValueAtTime(0.0001, now + 2);
        
        setTimeout(() => {
            wash.nodes?.forEach((node: AudioNode) => { 
              try { 
                // Stop oscillators/sources properly, not just disconnect
                if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
                  node.stop();
                }
                node.disconnect(); 
              } catch { /* ignore */ } 
            });
            try { wash.washMasterGain?.disconnect(); } catch { /* ignore */ }
        }, 2100);

        activeWashesRef.current.splice(existingWashIndex, 1);
        setActiveWashTypes(prev => prev.filter(t => t !== type));

        // If that was the last active wash and studio isn't playing, suspend context
        if (activeWashesRef.current.length === 0 && !isPlaying) {
            setTimeout(async () => {
              if (audioCtxRef.current && activeWashesRef.current.length === 0 && !isPlayingRef.current) {
                await audioCtxRef.current.suspend();
              }
            }, 2200);
        }
        return;
    }

    const wasSuspended = ctx.state === 'suspended';
    if (wasSuspended) {
      // Mute all studio channels BEFORE resuming so presets don't auto-play
      // Use .value (instant) not setValueAtTime (scheduled) to avoid race condition
      Object.keys(channelGainsRef.current).forEach(key => {
        const gainNode = channelGainsRef.current[key];
        gainNode.gain.cancelScheduledValues(0);
        gainNode.gain.value = 0;
      });
      await ctx.resume();
      // Do NOT set isPlaying — play button controls presets independently
      masterGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
      masterGainRef.current.gain.setValueAtTime(1, ctx.currentTime);
    }

    const washId = Math.random().toString(36).substring(7);

    setActiveWashTypes(prev => [...prev, type]);


    const washMasterGain = ctx.createGain();
    washMasterGain.gain.setValueAtTime(0.0001, now);
    washMasterGain.gain.exponentialRampToValueAtTime(1.0, now + 2);
    washMasterGain.connect(masterGainRef.current);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeNodes: any[] = [];

    if (type === 'euphoric') {
        const submersionFilter = ctx.createBiquadFilter();
        submersionFilter.type = 'lowpass';
        submersionFilter.Q.value = 1.5;
        
        const filterLFO = ctx.createOscillator();
        filterLFO.type = 'sine';
        filterLFO.frequency.value = 1 / 30;
        
        const filterScale = ctx.createGain();
        filterScale.gain.value = 1950;
        
        filterLFO.connect(filterScale);
        filterScale.connect(submersionFilter.frequency);
        submersionFilter.frequency.value = 2050;
        
        filterLFO.start(now);
        activeNodes.push(filterLFO, filterScale);

        const stereoPanner = ctx.createStereoPanner();
        stereoPanner.pan.setValueAtTime(0, now);
        const panLFO = ctx.createOscillator();
        panLFO.type = 'sine';
        panLFO.frequency.value = 0.1;
        const panDepth = ctx.createGain();
        panDepth.gain.setValueAtTime(0, now);
        panDepth.gain.linearRampToValueAtTime(0.8, now + 5);
        panLFO.connect(panDepth);
        panDepth.connect(stereoPanner.pan);
        panLFO.start(now);
        activeNodes.push(panLFO, panDepth);

        submersionFilter.connect(stereoPanner);
        stereoPanner.connect(washMasterGain);
        activeNodes.push(submersionFilter, stereoPanner);

        const harmonics = [1, 1.25, 1.5, 2];
        harmonics.forEach((multiplier, index) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(startFreq * multiplier, now);
            if (index > 0) {
               const detuneOsc = ctx.createOscillator();
               detuneOsc.type = 'sine';
               detuneOsc.frequency.setValueAtTime((startFreq * multiplier) + (index * 1.5), now);
               const dGain = ctx.createGain();
               dGain.gain.value = 0.15;
               detuneOsc.connect(dGain);
               dGain.connect(submersionFilter);
               detuneOsc.start(now);
               activeNodes.push(detuneOsc, dGain);
            }
            const oscGain = ctx.createGain();
            oscGain.gain.value = index === 0 ? 0.3 : 0.15;
            osc.connect(oscGain);
            oscGain.connect(submersionFilter);
            osc.start(now);
            activeNodes.push(osc, oscGain);
        });

        const bufferSize = ctx.sampleRate * 2; 
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const whiteRaw = Math.random() * 2 - 1;
            lastOut = (lastOut * 0.9) + (0.1 * whiteRaw);
            data[i] = lastOut * 2.0; 
        }
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = buffer;
        noiseSource.loop = true;
        
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 1000;
        noiseFilter.Q.value = 0.5;
        
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(0.08, now + 3);
        
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(stereoPanner);
        noiseSource.start(now);
        activeNodes.push(noiseSource, noiseFilter, noiseGain);
        
    } else if (type === 'flashbang') {
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
        swellGain.gain.exponentialRampToValueAtTime(0.05, now + flashbangDuration + 2);
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.exponentialRampToValueAtTime(4000, now + flashbangDuration);
        
        noise.connect(filter);
        filter.connect(swellGain);
        swellGain.connect(washMasterGain);
        noise.start(now);
        activeNodes.push(noise, filter, swellGain);

        const subOsc = ctx.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(40, now);
        const subGain = ctx.createGain();
        subGain.gain.setValueAtTime(0.0001, now);
        subGain.gain.setValueAtTime(0.0001, now + flashbangDuration); 
        subGain.gain.linearRampToValueAtTime(1.0, now + flashbangDuration + 0.1); 
        subGain.gain.linearRampToValueAtTime(0.0001, now + flashbangDuration + 3); 
        
        subOsc.connect(subGain);
        subGain.connect(washMasterGain);
        subOsc.start(now);
        activeNodes.push(subOsc, subGain);
        
        const ringOsc = ctx.createOscillator();
        ringOsc.type = 'sine';
        ringOsc.frequency.value = 6000;
        
        const amLFO = ctx.createOscillator();
        amLFO.type = 'sine';
        amLFO.frequency.value = 4;
        const amGain = ctx.createGain();
        amGain.gain.value = 0.5;
        amLFO.connect(amGain);
        
        const ringGain = ctx.createGain();
        ringGain.gain.setValueAtTime(0.0001, now);
        ringGain.gain.setValueAtTime(0.0001, now + flashbangDuration);
        ringGain.gain.exponentialRampToValueAtTime(0.15, now + flashbangDuration + 2);
        
        amGain.connect(ringGain.gain);
        
        ringOsc.connect(ringGain);
        ringGain.connect(washMasterGain);
        
        ringOsc.start(now);
        amLFO.start(now);
        activeNodes.push(ringOsc, amLFO, amGain, ringGain);
        
    } else if (type === 'liquid') {
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
        filter.Q.value = 5.0; 
        
        const filterLFO = ctx.createOscillator();
        filterLFO.type = 'sine';
        filterLFO.frequency.value = 1 / 15;
        const filterScale = ctx.createGain();
        filterScale.gain.value = 1400;
        filterLFO.connect(filterScale);
        filterScale.connect(filter.frequency);
        filter.frequency.value = 1600;
        filterLFO.start(now);
        activeNodes.push(filterLFO, filterScale);
        
        const panner = ctx.createStereoPanner();
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.5; 
        lfo.connect(panner.pan);
        lfo.start(now);
        activeNodes.push(lfo, panner, filter, shaper);

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(startFreq, now);
        
        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.5, now);
        
        osc.connect(oscGain);
        oscGain.connect(shaper);
        shaper.connect(filter);
        filter.connect(panner);
        panner.connect(washMasterGain);
        
        osc.start(now);
        activeNodes.push(osc, oscGain);
        
    } else if (type === 'glitch') {
        const panner = ctx.createStereoPanner();
        const panLFO = ctx.createOscillator();
        panLFO.type = 'sine';
        panLFO.frequency.value = 1.5; // Swirl
        panLFO.connect(panner.pan);
        panLFO.start(now);
        
        const delay = ctx.createDelay();
        delay.delayTime.value = 0.125; // 1/8th echo
        const delayFeedback = ctx.createGain();
        delayFeedback.gain.value = 0.6; // High feedback for trippy echo
        delay.connect(delayFeedback);
        delayFeedback.connect(delay);
        delay.connect(panner);

        const coreOsc = ctx.createOscillator();
        coreOsc.type = 'sine';
        coreOsc.frequency.value = 528;
        
        const fastLFO = ctx.createOscillator();
        fastLFO.type = 'square';
        fastLFO.frequency.value = 16;
        const fastGain = ctx.createGain();
        fastGain.gain.value = 0; 
        fastLFO.connect(fastGain.gain);
        
        const slowLFO = ctx.createOscillator();
        slowLFO.type = 'square';
        slowLFO.frequency.value = 4;
        const slowGain = ctx.createGain();
        slowGain.gain.value = 0;
        slowLFO.connect(slowGain.gain);
        
        const oscOutGain = ctx.createGain();
        oscOutGain.gain.value = 0.8;
        
        coreOsc.connect(fastGain);
        fastGain.connect(slowGain);
        slowGain.connect(oscOutGain);
        
        oscOutGain.connect(panner);
        oscOutGain.connect(delay);
        panner.connect(washMasterGain);
        
        coreOsc.start(now);
        fastLFO.start(now);
        slowLFO.start(now);
        
        const blipOsc = ctx.createOscillator();
        blipOsc.type = 'triangle';
        blipOsc.frequency.value = 852;
        
        const blipLFO = ctx.createOscillator();
        blipLFO.type = 'square';
        blipLFO.frequency.value = 2; 
        const blipGain = ctx.createGain();
        blipGain.gain.value = 0;
        blipLFO.connect(blipGain.gain);
        
        const blipOut = ctx.createGain();
        blipOut.gain.value = 0.15;
        blipOsc.connect(blipGain);
        blipGain.connect(blipOut);
        blipOut.connect(delay); 
        
        blipOsc.start(now);
        blipLFO.start(now);

        activeNodes.push(panner, panLFO, delay, delayFeedback, coreOsc, fastLFO, fastGain, slowLFO, slowGain, oscOutGain, blipOsc, blipLFO, blipGain, blipOut);
        
    } else if (type === 'cyber') {
        const coreOsc = ctx.createOscillator();
        coreOsc.type = 'sawtooth';
        coreOsc.frequency.value = startFreq || 852; 
        
        const coreFilter = ctx.createBiquadFilter();
        coreFilter.type = 'lowpass';
        coreFilter.frequency.value = 1200; 
        coreFilter.Q.value = 2.0;
        
        const coreLFO = ctx.createOscillator();
        coreLFO.type = 'square';
        coreLFO.frequency.value = 4;
        
        const coreGain = ctx.createGain();
        coreGain.gain.value = 0; 
        
        coreLFO.connect(coreGain.gain);
        coreOsc.connect(coreFilter);
        coreFilter.connect(coreGain);
        
        const outGain = ctx.createGain();
        outGain.gain.value = 0.4; 
        coreGain.connect(outGain);
        outGain.connect(washMasterGain);
        
        coreOsc.start(now);
        coreLFO.start(now);
        activeNodes.push(coreOsc, coreFilter, coreLFO, coreGain, outGain);

        const twinkleFreqs = [3000, 4500, 6000];
        const twinkleLFOFreqs = [3.1, 5.3, 7.9];
        
        const twinklePanner = ctx.createStereoPanner();
        const panLFO = ctx.createOscillator();
        panLFO.type = 'sine';
        panLFO.frequency.value = 2.3; 
        panLFO.connect(twinklePanner.pan);
        panLFO.start(now);
        twinklePanner.connect(washMasterGain);
        activeNodes.push(twinklePanner, panLFO);
        
        twinkleFreqs.forEach((freq, i) => {
            const tOsc = ctx.createOscillator();
            tOsc.type = 'sine';
            tOsc.frequency.value = freq;
            
            const tLFO = ctx.createOscillator();
            tLFO.type = 'sine';
            tLFO.frequency.value = twinkleLFOFreqs[i];
            
            const tGain = ctx.createGain();
            tGain.gain.value = 0.5; 
            
            const lfoScale = ctx.createGain();
            lfoScale.gain.value = 0.5;
            tLFO.connect(lfoScale);
            lfoScale.connect(tGain.gain);
            
            tOsc.connect(tGain);
            tGain.connect(twinklePanner);
            
            tOsc.start(now);
            tLFO.start(now);
            activeNodes.push(tOsc, tLFO, lfoScale, tGain);
        });

    } else if (type === 'bereginya') {
        // Dual-Core Frequency Bridge: 432 Hz and 963 Hz
        const baseFreqs = [432, 963];
        const harmonics = [1000, 2000, 5000]; // The 5-4-9 Matrix stack (simplified approximations)
        
        // Active Neuro Offset (Stereo panning pressure)
        const panner = ctx.createStereoPanner();
        const panLFO = ctx.createOscillator();
        panLFO.type = 'sine';
        panLFO.frequency.value = 0.1; // Slow, moving pressure
        panLFO.connect(panner.pan);
        panLFO.start(now);
        activeNodes.push(panner, panLFO);

        // The Snap / Vacuum Effect
        const snapFilter = ctx.createBiquadFilter();
        snapFilter.type = 'highpass';
        snapFilter.frequency.value = 20; // Default low
        
        // Schedule the snaps every 14 seconds
        for (let i = 0; i < 20; i++) {
            const snapTime = now + (i * 14) + 14;
            snapFilter.frequency.setValueAtTime(20, snapTime - 0.1);
            snapFilter.frequency.exponentialRampToValueAtTime(1000, snapTime);
            snapFilter.frequency.exponentialRampToValueAtTime(20, snapTime + 0.5);
        }

        snapFilter.connect(panner);
        panner.connect(washMasterGain);
        activeNodes.push(snapFilter);

        // Sub-Bass Grounding
        const subOsc = ctx.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.value = 60;
        const subGain = ctx.createGain();
        subGain.gain.value = 0.4;
        subOsc.connect(subGain);
        subGain.connect(panner); // Bypass snap filter for constant grounding
        subOsc.start(now);
        activeNodes.push(subOsc, subGain);

        // The Base Drone (Continuous)
        baseFreqs.forEach((freq) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const gain = ctx.createGain();
            gain.gain.value = 0.3;
            
            osc.connect(gain);
            gain.connect(snapFilter);
            osc.start(now);
            activeNodes.push(osc, gain);
        });

        // The Data Stream Sequencer (Beep Boops)
        const chopRates = [8, 4, 2]; // Square LFO speeds for each harmonic
        harmonics.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const gain = ctx.createGain();
            gain.gain.value = 0; // Modulated by LFO
            
            // Square wave LFO to chop the gain (creating distinct beeps)
            const gateLFO = ctx.createOscillator();
            gateLFO.type = 'square';
            gateLFO.frequency.value = chopRates[index];
            
            const gateDepth = ctx.createGain();
            gateDepth.gain.value = 0.15; // Volume of the beeps
            
            gateLFO.connect(gateDepth);
            gateDepth.connect(gain.gain);
            
            osc.connect(gain);
            gain.connect(snapFilter);
            
            osc.start(now);
            gateLFO.start(now);
            activeNodes.push(osc, gain, gateLFO, gateDepth);
        });

    } else if (type === 'astral') {
        const baseOsc = ctx.createOscillator();
        baseOsc.type = 'triangle';
        baseOsc.frequency.value = startFreq || 528;

        const fmOsc = ctx.createOscillator();
        fmOsc.type = 'sine';
        fmOsc.frequency.value = 5; // Rapid wobble
        const fmGain = ctx.createGain();
        fmGain.gain.value = 50; // Wobble depth
        fmOsc.connect(fmGain);
        fmGain.connect(baseOsc.frequency);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 2.0;
        
        const filterLFO = ctx.createOscillator();
        filterLFO.type = 'sine';
        filterLFO.frequency.value = 1 / 20; // 20 second sweep
        const filterGain = ctx.createGain();
        filterGain.gain.value = 2000;
        filterLFO.connect(filterGain);
        filterGain.connect(filter.frequency);
        filter.frequency.value = 2500;

        const panner = ctx.createStereoPanner();
        const panLFO = ctx.createOscillator();
        panLFO.type = 'sine';
        panLFO.frequency.value = 0.2; // Spatial swirl
        panLFO.connect(panner.pan);

        const delay = ctx.createDelay();
        delay.delayTime.value = 0.4;
        const feedback = ctx.createGain();
        feedback.gain.value = 0.6; // Heavy feedback
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(panner);

        const outGain = ctx.createGain();
        outGain.gain.value = 0.6;

        baseOsc.connect(filter);
        filter.connect(outGain);
        outGain.connect(panner);
        outGain.connect(delay);
        panner.connect(washMasterGain);

        baseOsc.start(now);
        fmOsc.start(now);
        filterLFO.start(now);
        panLFO.start(now);
        activeNodes.push(baseOsc, fmOsc, fmGain, filter, filterLFO, filterGain, panner, panLFO, delay, feedback, outGain);

    } else if (type === 'audirall') {
        // Brown Noise Generator
        const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; // Compensate for gain
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;
        
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 400; // Deep rumble
        
        const noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.8;
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(washMasterGain);
        noise.start(now);
        activeNodes.push(noise, noiseFilter, noiseGain);

        // 40Hz Gamma Binaural Beats
        const leftOsc = ctx.createOscillator();
        leftOsc.type = 'sine';
        leftOsc.frequency.value = 200; // Base carrier
        const leftPan = ctx.createStereoPanner();
        leftPan.pan.value = -1;
        
        const rightOsc = ctx.createOscillator();
        rightOsc.type = 'sine';
        rightOsc.frequency.value = 240; // 40Hz offset
        const rightPan = ctx.createStereoPanner();
        rightPan.pan.value = 1;
        
        const binauralGain = ctx.createGain();
        binauralGain.gain.value = 0.4;
        
        leftOsc.connect(leftPan);
        rightOsc.connect(rightPan);
        leftPan.connect(binauralGain);
        rightPan.connect(binauralGain);
        binauralGain.connect(washMasterGain);
        
        leftOsc.start(now);
        rightOsc.start(now);
        activeNodes.push(leftOsc, leftPan, rightOsc, rightPan, binauralGain);

        // Isochronic Metronome (14Hz Beta)
        const pulseOsc = ctx.createOscillator();
        pulseOsc.type = 'triangle';
        pulseOsc.frequency.value = 400;
        
        const pulseGain = ctx.createGain();
        pulseGain.gain.value = 0;
        
        const pulseLFO = ctx.createOscillator();
        pulseLFO.type = 'square';
        pulseLFO.frequency.value = 14; // 14 Hz rhythmic pulse
        
        const pulseDepth = ctx.createGain();
        pulseDepth.gain.value = 0.15;
        
        pulseLFO.connect(pulseDepth);
        pulseDepth.connect(pulseGain.gain);
        
        pulseOsc.connect(pulseGain);
        pulseGain.connect(washMasterGain);
        
        pulseOsc.start(now);
        pulseLFO.start(now);
        activeNodes.push(pulseOsc, pulseGain, pulseLFO, pulseDepth);

    } else if (type === 'ascender') {
        const numOscs = 6;
        const baseFreq = startFreq / 2;
        
        for (let i = 0; i < numOscs; i++) {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            const gain = ctx.createGain();
            
            const freqLFO = ctx.createOscillator();
            freqLFO.type = 'sawtooth';
            freqLFO.frequency.value = 1 / 30;
            
            const startPitch = baseFreq * Math.pow(2, i);
            
            const freqScale = ctx.createGain();
            freqScale.gain.value = startPitch;
            
            freqLFO.connect(freqScale);
            freqScale.connect(osc.frequency);
            osc.frequency.value = startPitch * 1.5;
            
            const amLFO = ctx.createOscillator();
            amLFO.type = 'sine';
            amLFO.frequency.value = 1 / 30;
            
            const amGain = ctx.createGain();
            amGain.gain.value = 0.5;
            
            amLFO.connect(amGain);
            amGain.connect(gain.gain);
            gain.gain.value = 0.5;
            
            osc.connect(gain);
            gain.connect(washMasterGain);
            
            osc.start(now);
            freqLFO.start(now);
            amLFO.start(now);
            activeNodes.push(osc, gain, freqLFO, freqScale, amLFO, amGain);
        }

    } else if (type === 'descender') {
        // Infinite Descender - Shepard Tone falling forever
        const numOscs = 6;
        const baseFreq = startFreq / 2;
        
        for (let i = 0; i < numOscs; i++) {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            const gain = ctx.createGain();
            
            // Inverse sawtooth for descending
            const freqLFO = ctx.createOscillator();
            freqLFO.type = 'sawtooth';
            freqLFO.frequency.value = 1 / 30;
            
            const startPitch = baseFreq * Math.pow(2, i);
            
            const freqScale = ctx.createGain();
            freqScale.gain.value = -startPitch; // Negative = descending
            
            freqLFO.connect(freqScale);
            freqScale.connect(osc.frequency);
            osc.frequency.value = startPitch * 1.5;
            
            const amLFO = ctx.createOscillator();
            amLFO.type = 'sine';
            amLFO.frequency.value = 1 / 30;
            
            const amGain = ctx.createGain();
            amGain.gain.value = 0.5;
            
            amLFO.connect(amGain);
            amGain.connect(gain.gain);
            gain.gain.value = 0.5;
            
            osc.connect(gain);
            gain.connect(washMasterGain);
            
            osc.start(now);
            freqLFO.start(now);
            amLFO.start(now);
            activeNodes.push(osc, gain, freqLFO, freqScale, amLFO, amGain);
        }

    } else if (type === 'tibetan') {
        // Tibetan Singing Bowl Drone - detuned sines with slow beating
        const bowlFreq = startFreq || 136; // Om frequency
        const partials = [1, 2.71, 4.16, 5.43, 6.58]; // Bowl harmonic ratios
        
        partials.forEach((partial, idx) => {
            const freq = bowlFreq * partial;
            
            // Main tone
            const osc1 = ctx.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.value = freq;
            
            // Slightly detuned partner (creates beating)
            const osc2 = ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.value = freq + (0.5 + idx * 0.3); // Slow beat
            
            // AM modulation for shimmer
            const shimmerLFO = ctx.createOscillator();
            shimmerLFO.type = 'sine';
            shimmerLFO.frequency.value = 0.1 + idx * 0.05;
            const shimmerGain = ctx.createGain();
            shimmerGain.gain.value = 0.3;
            shimmerLFO.connect(shimmerGain);
            
            const partialGain = ctx.createGain();
            const amplitude = 0.25 / (idx + 1); // Higher partials quieter
            partialGain.gain.value = amplitude;
            shimmerGain.connect(partialGain.gain);
            
            osc1.connect(partialGain);
            osc2.connect(partialGain);
            partialGain.connect(washMasterGain);
            
            osc1.start(now);
            osc2.start(now);
            shimmerLFO.start(now);
            activeNodes.push(osc1, osc2, shimmerLFO, shimmerGain, partialGain);
        });
        
        // Sub-harmonic drone
        const subOsc = ctx.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.value = bowlFreq / 2;
        const subGain = ctx.createGain();
        subGain.gain.value = 0.15;
        subOsc.connect(subGain);
        subGain.connect(washMasterGain);
        subOsc.start(now);
        activeNodes.push(subOsc, subGain);

    } else if (type === 'nervetap') {
        // Nerve Tapper - Bilateral stimulation (EMDR-inspired)
        const tapRate = 2; // taps per second per side
        
        // Left channel click
        const leftOsc = ctx.createOscillator();
        leftOsc.type = 'sine';
        leftOsc.frequency.value = 800;
        const leftPan = ctx.createStereoPanner();
        leftPan.pan.value = -1;
        const leftGate = ctx.createGain();
        leftGate.gain.value = 0;
        
        const leftLFO = ctx.createOscillator();
        leftLFO.type = 'square';
        leftLFO.frequency.value = tapRate;
        const leftDepth = ctx.createGain();
        leftDepth.gain.value = 0.4;
        leftLFO.connect(leftDepth);
        leftDepth.connect(leftGate.gain);
        
        leftOsc.connect(leftGate);
        leftGate.connect(leftPan);
        leftPan.connect(washMasterGain);
        
        // Right channel click (phase offset via cosine-like trick)
        const rightOsc = ctx.createOscillator();
        rightOsc.type = 'sine';
        rightOsc.frequency.value = 820; // Slight detune for depth
        const rightPan = ctx.createStereoPanner();
        rightPan.pan.value = 1;
        const rightGate = ctx.createGain();
        rightGate.gain.value = 0;
        
        const rightLFO = ctx.createOscillator();
        rightLFO.type = 'square';
        rightLFO.frequency.value = tapRate;
        const rightDepth = ctx.createGain();
        rightDepth.gain.value = 0.4;
        rightLFO.connect(rightDepth);
        rightDepth.connect(rightGate.gain);
        
        rightOsc.connect(rightGate);
        rightGate.connect(rightPan);
        rightPan.connect(washMasterGain);
        
        // Start right LFO half a cycle late for alternation
        leftOsc.start(now);
        leftLFO.start(now);
        rightOsc.start(now);
        rightLFO.start(now + (1 / tapRate / 2)); // Half-cycle offset
        
        // Soft ambient pad underneath
        const padOsc = ctx.createOscillator();
        padOsc.type = 'sine';
        padOsc.frequency.value = 396; // Release frequency
        const padOsc2 = ctx.createOscillator();
        padOsc2.type = 'sine';
        padOsc2.frequency.value = 398; // Beating
        const padGain = ctx.createGain();
        padGain.gain.value = 0.08;
        padOsc.connect(padGain);
        padOsc2.connect(padGain);
        padGain.connect(washMasterGain);
        padOsc.start(now);
        padOsc2.start(now);
        
        activeNodes.push(leftOsc, leftPan, leftGate, leftLFO, leftDepth, rightOsc, rightPan, rightGate, rightLFO, rightDepth, padOsc, padOsc2, padGain);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeWashesRef.current.push({ id: washId, type, startOffset: now, startFreq, duration: 0, nodes: activeNodes as AudioNode[], washMasterGain });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initEngine]);

  const setWashVolume = useCallback((washType: string, value: number) => {
    const wash = activeWashesRef.current.find(w => w.type === washType);
    if (wash?.washMasterGain && audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      const normalized = Math.max(value / 100, 0.0001);
      wash.washMasterGain.gain.cancelScheduledValues(ctx.currentTime);
      wash.washMasterGain.gain.linearRampToValueAtTime(normalized, ctx.currentTime + 0.1);
    }
  }, []);

  return { isPlaying, activeWashTypes, getActiveWashData, togglePlay, elapsedTime, setVolume, updateCustomNode, updateIsochronic, initEngine, getAnalyser, isRecording, startRecording, stopRecording, toggleWash, setWashVolume };
}
