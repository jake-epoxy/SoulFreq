const fs = require('fs');
let code = fs.readFileSync('src/hooks/useAudioEngine.ts', 'utf8');

// The cyber synthesis block was injected at line 601.
// Let's remove it from getActiveWashData.
const badStart = code.indexOf("         } else if (type === 'cyber') {\n        const coreOsc = ctx.createOscillator();");
const badEnd = code.indexOf("        activeNodes.push(tOsc, tLFO, lfoScale, tGain);\n        });\n\n    } else if (type === 'ascender') {");

if (badStart !== -1 && badEnd !== -1) {
    code = code.substring(0, badStart) + code.substring(badEnd + 104); // the length to cut exactly before } else if (type === 'ascender')
}

// Now let's carefully add it into toggleWash
const toggleWashAscenderStart = code.lastIndexOf("    } else if (type === 'ascender') {");
if (toggleWashAscenderStart !== -1) {
    const synthAdd = `    } else if (type === 'cyber') {
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

`;
    code = code.substring(0, toggleWashAscenderStart) + synthAdd + code.substring(toggleWashAscenderStart);
}

fs.writeFileSync('src/hooks/useAudioEngine.ts', code);
console.log('Fixed useAudioEngine.ts cyber synthesis position');
