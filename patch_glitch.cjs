const fs = require('fs');

let code = fs.readFileSync('src/hooks/useAudioEngine.ts', 'utf8');

// 1. Update the signature
code = code.replace(
  /type: 'euphoric' \| 'flashbang' \| 'liquid' \| 'ascender' = 'euphoric'/g,
  "type: 'euphoric' | 'flashbang' | 'liquid' | 'ascender' | 'glitch' = 'euphoric'"
);

// 2. Add HUD display logic
const hudSearch = `} else if (type === 'ascender') {`;
const hudAdd = `} else if (type === 'glitch') {
             const popSpeed = (elapsed % 1) < 0.5 ? '16Hz' : '4Hz';
             const freqDisplay = Math.random() > 0.9 ? '852' : '528';
             displayHz = \`[\${freqDisplay}Hz] AM-\${popSpeed}\`;
         `;
code = code.replace(hudSearch, hudAdd + hudSearch);

// 3. Add synthesis logic
const synthSearch = `} else if (type === 'ascender') {`;
const synthAdd = `} else if (type === 'glitch') {
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
code = code.replace(synthSearch, synthAdd + synthSearch);

fs.writeFileSync('src/hooks/useAudioEngine.ts', code);
console.log('Patched useAudioEngine.ts');


// Patch Studio.tsx
let studio = fs.readFileSync('src/components/Studio.tsx', 'utf8');

studio = studio.replace(
    /const title = type === 'euphoric' \? 'Euphoric Wash' : type === 'flashbang' \? 'Somatic Flashbang' : type === 'liquid' \? 'Liquid Fold' : 'Infinite Ascender';/,
    `const title = type === 'euphoric' ? 'Euphoric Wash' : type === 'flashbang' ? 'Somatic Flashbang' : type === 'liquid' ? 'Liquid Fold' : type === 'glitch' ? 'Neuro-Glitch' : 'Infinite Ascender';`
);

studio = studio.replace(
    /const accent = type === 'euphoric' \? '#00F0FF' : type === 'flashbang' \? '#FF0080' : type === 'liquid' \? '#00FF88' : '#FFD700';/,
    `const accent = type === 'euphoric' ? '#00F0FF' : type === 'flashbang' ? '#FF0080' : type === 'liquid' ? '#00FF88' : type === 'glitch' ? '#B500FF' : '#FFD700';`
);

// Add the button
const buttonSearch = `              <button 
                className="cta-button"
                style={{ padding: '0.75rem', background: activeWashTypes.includes('ascender') ? 'rgba(255, 215, 0, 0.1)' : 'linear-gradient(90deg, #FFD700, #FF8C00)'`;

const buttonAdd = `              <button 
                className="cta-button"
                style={{ padding: '0.75rem', background: activeWashTypes.includes('glitch') ? 'rgba(181, 0, 255, 0.1)' : 'linear-gradient(90deg, #B500FF, #00FF88)', border: activeWashTypes.includes('glitch') ? '1px solid rgba(181, 0, 255, 0.3)' : 'none', borderRadius: '8px', color: activeWashTypes.includes('glitch') ? '#B500FF' : 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.3s ease', boxShadow: activeWashTypes.includes('glitch') ? '0 0 20px rgba(181,0,255,0.4), inset 0 0 10px rgba(181,0,255,0.2)' : 'none' }}
                onClick={() => toggleWash(customBase, 'glitch')}
              >
                {activeWashTypes.includes('glitch') ? '■ STOP NEURO-GLITCH' : 'Neuro-Glitch'}
              </button>
`;

studio = studio.replace(buttonSearch, buttonAdd + buttonSearch);

// Also need to adjust the grid template columns to handle 5 items nicely
studio = studio.replace(
    /<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>/,
    `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>`
);

fs.writeFileSync('src/components/Studio.tsx', studio);
console.log('Patched Studio.tsx');

