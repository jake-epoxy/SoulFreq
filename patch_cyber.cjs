const fs = require('fs');

let code = fs.readFileSync('src/hooks/useAudioEngine.ts', 'utf8');

// 1. Update the signature
code = code.replace(
  /type: 'euphoric' \| 'flashbang' \| 'liquid' \| 'ascender' \| 'glitch' = 'euphoric'/g,
  "type: 'euphoric' | 'flashbang' | 'liquid' | 'ascender' | 'glitch' | 'cyber' = 'euphoric'"
);

// 2. Add HUD display logic
const hudSearch = `} else if (type === 'ascender') {`;
const hudAdd = `} else if (type === 'cyber') {
             const poly = Math.random() > 0.5 ? 'SYNC' : 'OFFSET';
             displayHz = \`[852Hz] POLY-\${poly}\`;
         `;
code = code.replace(hudSearch, hudAdd + hudSearch);

// 3. Add synthesis logic
const synthSearch = `    } else if (type === 'ascender') {`;
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
code = code.replace(synthSearch, synthAdd + synthSearch);

fs.writeFileSync('src/hooks/useAudioEngine.ts', code);
console.log('Patched useAudioEngine.ts');


// Patch Studio.tsx
let studio = fs.readFileSync('src/components/Studio.tsx', 'utf8');

studio = studio.replace(
    /const title = type === 'euphoric' \? 'Euphoric Wash' : type === 'flashbang' \? 'Somatic Flashbang' : type === 'liquid' \? 'Liquid Fold' : type === 'glitch' \? 'Neuro-Glitch' : 'Infinite Ascender';/,
    `const title = type === 'euphoric' ? 'Euphoric Wash' : type === 'flashbang' ? 'Somatic Flashbang' : type === 'liquid' ? 'Liquid Fold' : type === 'glitch' ? 'Neuro-Glitch' : type === 'cyber' ? 'Cyber Twinkle' : 'Infinite Ascender';`
);

studio = studio.replace(
    /const accent = type === 'euphoric' \? '#00F0FF' : type === 'flashbang' \? '#FF0080' : type === 'liquid' \? '#00FF88' : type === 'glitch' \? '#B500FF' : '#FFD700';/,
    `const accent = type === 'euphoric' ? '#00F0FF' : type === 'flashbang' ? '#FF0080' : type === 'liquid' ? '#00FF88' : type === 'glitch' ? '#B500FF' : type === 'cyber' ? '#00FFFF' : '#FFD700';`
);

// Add the button
const buttonSearch = `              <button 
                className="cta-button"
                style={{ padding: '0.75rem', background: activeWashTypes.includes('ascender') ? 'rgba(255, 215, 0, 0.1)' : 'linear-gradient(90deg, #FFD700, #FF8C00)'`;

const buttonAdd = `              <button 
                className="cta-button"
                style={{ padding: '0.75rem', background: activeWashTypes.includes('cyber') ? 'rgba(0, 255, 255, 0.1)' : 'linear-gradient(90deg, #00FFFF, #0088FF)', border: activeWashTypes.includes('cyber') ? '1px solid rgba(0, 255, 255, 0.3)' : 'none', borderRadius: '8px', color: activeWashTypes.includes('cyber') ? '#00FFFF' : 'black', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.3s ease', boxShadow: activeWashTypes.includes('cyber') ? '0 0 20px rgba(0,255,255,0.4), inset 0 0 10px rgba(0,255,255,0.2)' : 'none' }}
                onClick={() => toggleWash(customBase, 'cyber')}
              >
                {activeWashTypes.includes('cyber') ? '■ STOP CYBER TWINKLE' : 'Cyber Twinkle'}
              </button>
`;

studio = studio.replace(buttonSearch, buttonAdd + buttonSearch);

fs.writeFileSync('src/components/Studio.tsx', studio);
console.log('Patched Studio.tsx');

