const fs = require('fs');

let code = fs.readFileSync('src/hooks/useAudioEngine.ts', 'utf8');

const startIndex = code.indexOf('  const getActiveWashData = useCallback(() => {');
const endIndex = code.indexOf('  return { isPlaying, activeWashTypes');

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find start or end index for replacing useAudioEngine hook");
    process.exit(1);
}

const replacement = `  const getActiveWashData = useCallback(() => {
     if (!audioCtxRef.current || activeWashesRef.current.length === 0) return [];
     
     const now = audioCtxRef.current.currentTime;
     const currentWashes = [];
     
     for (const wash of activeWashesRef.current) {
         const elapsed = now - wash.startOffset;
         const { type, startFreq, id } = wash as any;
         let displayHz = "";
         
         if (type === 'euphoric') {
             const cycle = (Math.sin(elapsed * Math.PI * 2 / 30) + 1) / 2;
             const currentF = 100 * Math.pow(4000 / 100, cycle);
             displayHz = \`\${Math.round(currentF)} Hz LPF\`;
         } else if (type === 'flashbang') {
             displayHz = "6000 Hz RES";
         } else if (type === 'liquid') {
             const cycle = (Math.sin(elapsed * Math.PI * 2 / 15) + 1) / 2;
             const currentF = 200 * Math.pow(3000 / 200, cycle);
             displayHz = \`\${Math.round(currentF)} Hz BPF\`;
         } else if (type === 'ascender') {
             const baseFreq = startFreq / 2;
             const cycle = (elapsed % 30) / 30;
             const currentPitch = baseFreq * Math.pow(4, cycle);
             displayHz = \`\${Math.round(currentPitch)} Hz Rising\`;
         }
         
         currentWashes.push({ id, type, elapsed, displayHz });
     }
     
     return currentWashes;
  }, []);

  const toggleWash = useCallback(async (startFreq: number, type: 'euphoric' | 'flashbang' | 'liquid' | 'ascender' = 'euphoric') => {
    if (!options?.isPremium && playbackTimeRef.current >= CUTOFF_SECONDS) {
      if (options?.onCutoff) options.onCutoff();
      return;
    }

    if (!audioCtxRef.current) initEngine();
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current) return;
    const now = ctx.currentTime;

    const existingWashIndex = activeWashesRef.current.findIndex((w: any) => w.type === type);
    if (existingWashIndex !== -1) {
        const wash = activeWashesRef.current[existingWashIndex] as any;
        wash.washMasterGain.gain.cancelScheduledValues(now);
        wash.washMasterGain.gain.setValueAtTime(wash.washMasterGain.gain.value, now);
        wash.washMasterGain.gain.linearRampToValueAtTime(0.0001, now + 2);
        
        setTimeout(() => {
            wash.nodes.forEach((node: any) => { try { node.disconnect(); } catch { /* ignore */ } });
            try { wash.washMasterGain.disconnect(); } catch { /* ignore */ }
        }, 2100);

        activeWashesRef.current.splice(existingWashIndex, 1);
        setActiveWashTypes(prev => prev.filter(t => t !== type));
        return;
    }

    const wasSuspended = ctx.state === 'suspended';
    if (wasSuspended) {
      await ctx.resume();
      setIsPlaying(true);
      masterGainRef.current.gain.cancelScheduledValues(now);
      masterGainRef.current.gain.setValueAtTime(0, now);
      masterGainRef.current.gain.linearRampToValueAtTime(1, now + 0.1);
    }

    const washId = Math.random().toString(36).substring(7);
    const isFirstWash = activeWashesRef.current.length === 0;

    setActiveWashTypes(prev => [...prev, type]);

    if (isFirstWash) {
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
            }
        });
    }

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
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeWashesRef.current.push({ id: washId, type, startOffset: now, startFreq, nodes: activeNodes, washMasterGain } as any);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initEngine]);

`;

code = code.substring(0, startIndex) + replacement + code.substring(endIndex);

// Add toggleWash to return object and remove triggerSweep
code = code.replace('startRecording, stopRecording, triggerSweep };', 'startRecording, stopRecording, toggleWash };');

fs.writeFileSync('src/hooks/useAudioEngine.ts', code);
console.log('Successfully patched useAudioEngine.ts');
