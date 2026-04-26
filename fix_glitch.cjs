const fs = require('fs');
let code = fs.readFileSync('src/hooks/useAudioEngine.ts', 'utf8');

// The glitch synthesis block was injected at line 598.
// Let's remove it from getActiveWashData.
const badStart = code.indexOf("         } else if (type === 'glitch') {\n        const panner = ctx.createStereoPanner();");
const badEnd = code.indexOf("        activeNodes.push(panner, panLFO, delay, delayFeedback, coreOsc, fastLFO, fastGain, slowLFO, slowGain, oscOutGain, blipOsc, blipLFO, blipGain, blipOut);\n        \n    } else if (type === 'ascender') {");

if (badStart !== -1 && badEnd !== -1) {
    code = code.substring(0, badStart) + code.substring(badEnd + 195); // length of the string
}

// Now let's carefully add it into toggleWash
const toggleWashAscenderStart = code.lastIndexOf("    } else if (type === 'ascender') {");
if (toggleWashAscenderStart !== -1) {
    const synthAdd = `    } else if (type === 'glitch') {
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
        
`;
    code = code.substring(0, toggleWashAscenderStart) + synthAdd + code.substring(toggleWashAscenderStart);
}

fs.writeFileSync('src/hooks/useAudioEngine.ts', code);
console.log('Fixed useAudioEngine.ts');
