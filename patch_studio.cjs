const fs = require('fs');

let code = fs.readFileSync('src/components/Studio.tsx', 'utf8');

// 1. Remove INITIAL_WASHES
const initialWashesRegex = /const INITIAL_WASHES: Config\[\] = \[[\s\S]*?\];/g;
code = code.replace(initialWashesRegex, '');

// 2. Remove washes from PRESETS settings
code = code.replace(/,\s*washes:\s*\{[^}]*\}/g, '');

// 3. Destructure activeWashType and getActiveWashData
code = code.replace(
    'const { isPlaying, isWashing, togglePlay',
    'const { isPlaying, isWashing, activeWashType, getActiveWashData, togglePlay'
);

// 4. Add HUD refs
code = code.replace(
    'const canvasRef = useRef<HTMLCanvasElement>(null);',
    'const canvasRef = useRef<HTMLCanvasElement>(null);\n  const hudRef = useRef<HTMLDivElement>(null);\n  const hudHzRef = useRef<HTMLSpanElement>(null);\n  const hudProgRef = useRef<HTMLDivElement>(null);'
);

// 5. Remove washes state
code = code.replace(
    'const [washes, setWashes] = useState<Config[]>(INITIAL_WASHES);\n',
    ''
);

// 6. Remove handleWashChange
const handleWashChangeRegex = /const handleWashChange = \([\s\S]*?};\n/g;
code = code.replace(handleWashChangeRegex, '');

// 7. Remove washes from applyPreset
code = code.replace(
    'const newWashes = washes.map(w => ({ ...w, value: preset.settings.washes[w.name as keyof typeof preset.settings.washes] }));\n     setWashes(newWashes);\n',
    ''
);
code = code.replace(
    'newWashes.forEach(w => setVolume(w.name, w.value));\n     ',
    ''
);

// 8. Remove washes from saveToMemory
code = code.replace(
    /,\s*washes:\s*Object\.fromEntries\(washes\.map\(w => \[w\.name, w\.value\]\)\)/g,
    ''
);

// 9. Update the visualizer loop to include HUD updates
const renderEndIndex = code.indexOf('animationFrameId = requestAnimationFrame(render);', code.indexOf('// Base radius and center'));
const hudLogic = `
      const washData = getActiveWashData();
      if (hudRef.current && hudHzRef.current && hudProgRef.current) {
         if (washData) {
            hudRef.current.style.opacity = '1';
            hudRef.current.style.transform = 'translateY(0)';
            hudHzRef.current.innerText = washData.displayHz;
            hudProgRef.current.style.width = \`\${(washData.elapsed / washData.duration) * 100}%\`;
         } else {
            hudRef.current.style.opacity = '0';
            hudRef.current.style.transform = 'translateY(10px)';
         }
      }
      
      animationFrameId = requestAnimationFrame(render);`;
code = code.substring(0, renderEndIndex) + hudLogic + code.substring(renderEndIndex + 49);

// 10. Replace the entire Continuous Trippy Washes UI block with the Buttons + HUD
const uiStartStr = '<h4 style={{ color: \'#00F0FF\', marginBottom: \'1rem\', display: \'flex\', alignItems: \'center\', gap: \'0.5rem\' }}>';
const uiStart = code.indexOf(uiStartStr);
const uiEndStr = 'Trigger Somatic Flashbang Drop\n              </button>\n            </div>\n        </div>';
const uiEnd = code.indexOf(uiEndStr, uiStart) + uiEndStr.length;

const buttonsHTML = `<h4 style={{ color: '#00F0FF', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} />
              Kinetic Washes (Scroll Stoppers)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button 
                className="cta-button"
                style={{ padding: '0.75rem', background: isWashing && activeWashType === 'euphoric' ? 'rgba(0, 240, 255, 0.1)' : 'linear-gradient(90deg, #00F0FF, #0088FF)', border: isWashing && activeWashType === 'euphoric' ? '1px solid rgba(0, 240, 255, 0.3)' : 'none', borderRadius: '8px', color: isWashing && activeWashType === 'euphoric' ? '#00F0FF' : 'black', fontWeight: 'bold', cursor: isWashing ? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: isWashing && activeWashType !== 'euphoric' ? 0.3 : 1 }}
                onClick={() => triggerSweep(customBase, 30, 'euphoric')}
                disabled={isWashing}
              >
                Euphoric Wash
              </button>
              <button 
                className="cta-button"
                style={{ padding: '0.75rem', background: isWashing && activeWashType === 'flashbang' ? 'rgba(255, 0, 128, 0.1)' : 'linear-gradient(90deg, #FF0080, #7928CA)', border: isWashing && activeWashType === 'flashbang' ? '1px solid rgba(255, 0, 128, 0.3)' : 'none', borderRadius: '8px', color: isWashing && activeWashType === 'flashbang' ? '#FF0080' : 'white', fontWeight: 'bold', cursor: isWashing ? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: isWashing && activeWashType !== 'flashbang' ? 0.3 : 1 }}
                onClick={() => triggerSweep(customBase, 30, 'flashbang')}
                disabled={isWashing}
              >
                Somatic Flashbang
              </button>
              <button 
                className="cta-button"
                style={{ padding: '0.75rem', background: isWashing && activeWashType === 'liquid' ? 'rgba(0, 255, 136, 0.1)' : 'linear-gradient(90deg, #00FF88, #008855)', border: isWashing && activeWashType === 'liquid' ? '1px solid rgba(0, 255, 136, 0.3)' : 'none', borderRadius: '8px', color: isWashing && activeWashType === 'liquid' ? '#00FF88' : 'black', fontWeight: 'bold', cursor: isWashing ? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: isWashing && activeWashType !== 'liquid' ? 0.3 : 1 }}
                onClick={() => triggerSweep(customBase, 30, 'liquid')}
                disabled={isWashing}
              >
                Liquid Fold
              </button>
              <button 
                className="cta-button"
                style={{ padding: '0.75rem', background: isWashing && activeWashType === 'ascender' ? 'rgba(255, 215, 0, 0.1)' : 'linear-gradient(90deg, #FFD700, #FF8C00)', border: isWashing && activeWashType === 'ascender' ? '1px solid rgba(255, 215, 0, 0.3)' : 'none', borderRadius: '8px', color: isWashing && activeWashType === 'ascender' ? '#FFD700' : 'black', fontWeight: 'bold', cursor: isWashing ? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: isWashing && activeWashType !== 'ascender' ? 0.3 : 1 }}
                onClick={() => triggerSweep(customBase, 30, 'ascender')}
                disabled={isWashing}
              >
                Infinite Ascender
              </button>
            </div>
            
            {/* Real-time Frequency HUD */}
            <div 
              ref={hudRef}
              style={{ 
                 marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.5)', 
                 border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '8px',
                 display: 'flex', flexDirection: 'column', gap: '0.5rem',
                 opacity: 0, transform: 'translateY(10px)', transition: 'all 0.3s ease'
              }}
            >
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Live Synthesis</span>
                 <span ref={hudHzRef} style={{ color: '#00F0FF', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1.1rem' }}>-- Hz</span>
               </div>
               <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                 <div ref={hudProgRef} style={{ width: '0%', height: '100%', background: 'linear-gradient(90deg, #00F0FF, #FF0080)', transition: 'width 0.1s linear' }} />
               </div>
            </div>
        </div>`;

code = code.substring(0, uiStart) + buttonsHTML + code.substring(uiEnd);

fs.writeFileSync('src/components/Studio.tsx', code);
console.log('patched studio successfully');
