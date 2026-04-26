const fs = require('fs');
let code = fs.readFileSync('src/components/Studio.tsx', 'utf8');

// 1. Replace triggerSweep with toggleWash in destructuring
code = code.replace(
    'isRecording, startRecording, stopRecording, triggerSweep } = useAudioEngine',
    'isRecording, startRecording, stopRecording, toggleWash } = useAudioEngine'
);

// 2. Replace WashHUDItem definition
const hudStart = code.indexOf('const WashHUDItem = ({ type, getActiveWashData }');
const hudEnd = code.indexOf('export default function Studio') - 1;

const newHud = `const WashHUDItem = ({ type, getActiveWashData }: { type: string, getActiveWashData: () => {type: string, elapsed: number, displayHz: string}[] }) => {
    const hudHzRef = useRef<HTMLSpanElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setIsVisible(true));
        let animationFrameId: number;
        const render = () => {
            const dataArray = getActiveWashData();
            const data = dataArray.find((d: {type: string, elapsed: number, displayHz: string}) => d.type === type);
            if (data && hudHzRef.current) {
                hudHzRef.current.innerText = data.displayHz;
            }
            animationFrameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [type, getActiveWashData]);

    const title = type === 'euphoric' ? 'Euphoric Wash' : type === 'flashbang' ? 'Somatic Flashbang' : type === 'liquid' ? 'Liquid Fold' : 'Infinite Ascender';
    const accent = type === 'euphoric' ? '#00F0FF' : type === 'flashbang' ? '#FF0080' : type === 'liquid' ? '#00FF88' : '#FFD700';

    return (
        <div style={{ marginTop: '0.5rem', padding: '1rem', background: 'rgba(0,10,15,0.8)', border: \`1px solid \${accent}40\`, borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.8rem', opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(10px)', transition: 'all 0.3s ease', boxShadow: \`0 0 20px \${accent}20, inset 0 0 10px \${accent}10\` }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: accent, boxShadow: \`0 0 15px \${accent}\`, animation: 'pulse-dot 1.5s infinite ease-in-out' }} />
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 'bold' }}>{title} Live</span>
             </div>
             <span ref={hudHzRef} style={{ color: accent, fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1.2rem', textShadow: \`0 0 10px \${accent}80\` }}>-- Hz</span>
           </div>
           <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
             <div style={{ width: '40%', height: '100%', background: \`linear-gradient(90deg, transparent, \${accent}, transparent)\`, position: 'absolute', animation: 'scanline 2s infinite linear' }} />
           </div>
        </div>
    );
};
`;

code = code.substring(0, hudStart) + newHud + '\n' + code.substring(hudEnd);

// 3. Replace Button Logic
// Euphoric
code = code.replace(
    /<button\s+className="cta-button"\s+style={{ padding: '0.75rem', background: activeWashTypes.includes\('euphoric'\) \? 'rgba\(0, 240, 255, 0.1\)' : 'linear-gradient\(90deg, #00F0FF, #0088FF\)', border: activeWashTypes.includes\('euphoric'\) \? '1px solid rgba\(0, 240, 255, 0.3\)' : 'none', borderRadius: '8px', color: activeWashTypes.includes\('euphoric'\) \? '#00F0FF' : 'black', fontWeight: 'bold', cursor: activeWashTypes.includes\('euphoric'\) \? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: activeWashTypes.includes\('euphoric'\) \? 0.6 : 1 }}\s+onClick=\{\(\) => triggerSweep\(customBase, 30, 'euphoric'\)\}\s+disabled=\{activeWashTypes.includes\('euphoric'\)\}\s+>\s+Euphoric Wash\s+<\/button>/,
    `<button 
                className="cta-button"
                style={{ padding: '0.75rem', background: activeWashTypes.includes('euphoric') ? 'rgba(0, 240, 255, 0.1)' : 'linear-gradient(90deg, #00F0FF, #0088FF)', border: activeWashTypes.includes('euphoric') ? '1px solid rgba(0, 240, 255, 0.3)' : 'none', borderRadius: '8px', color: activeWashTypes.includes('euphoric') ? '#00F0FF' : 'black', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.3s ease', boxShadow: activeWashTypes.includes('euphoric') ? '0 0 20px rgba(0,240,255,0.4), inset 0 0 10px rgba(0,240,255,0.2)' : 'none' }}
                onClick={() => toggleWash(customBase, 'euphoric')}
              >
                {activeWashTypes.includes('euphoric') ? '■ STOP EUPHORIC' : 'Euphoric Wash'}
              </button>`
);

// Flashbang
code = code.replace(
    /<button\s+className="cta-button"\s+style={{ padding: '0.75rem', background: activeWashTypes.includes\('flashbang'\) \? 'rgba\(255, 0, 128, 0.1\)' : 'linear-gradient\(90deg, #FF0080, #7928CA\)', border: activeWashTypes.includes\('flashbang'\) \? '1px solid rgba\(255, 0, 128, 0.3\)' : 'none', borderRadius: '8px', color: activeWashTypes.includes\('flashbang'\) \? '#FF0080' : 'white', fontWeight: 'bold', cursor: activeWashTypes.includes\('flashbang'\) \? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: activeWashTypes.includes\('flashbang'\) \? 0.6 : 1 }}\s+onClick=\{\(\) => triggerSweep\(customBase, 30, 'flashbang'\)\}\s+disabled=\{activeWashTypes.includes\('flashbang'\)\}\s+>\s+Somatic Flashbang\s+<\/button>/,
    `<button 
                className="cta-button"
                style={{ padding: '0.75rem', background: activeWashTypes.includes('flashbang') ? 'rgba(255, 0, 128, 0.1)' : 'linear-gradient(90deg, #FF0080, #7928CA)', border: activeWashTypes.includes('flashbang') ? '1px solid rgba(255, 0, 128, 0.3)' : 'none', borderRadius: '8px', color: activeWashTypes.includes('flashbang') ? '#FF0080' : 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.3s ease', boxShadow: activeWashTypes.includes('flashbang') ? '0 0 20px rgba(255,0,128,0.4), inset 0 0 10px rgba(255,0,128,0.2)' : 'none' }}
                onClick={() => toggleWash(customBase, 'flashbang')}
              >
                {activeWashTypes.includes('flashbang') ? '■ STOP FLASHBANG' : 'Somatic Flashbang'}
              </button>`
);

// Liquid
code = code.replace(
    /<button\s+className="cta-button"\s+style={{ padding: '0.75rem', background: activeWashTypes.includes\('liquid'\) \? 'rgba\(0, 255, 136, 0.1\)' : 'linear-gradient\(90deg, #00FF88, #008855\)', border: activeWashTypes.includes\('liquid'\) \? '1px solid rgba\(0, 255, 136, 0.3\)' : 'none', borderRadius: '8px', color: activeWashTypes.includes\('liquid'\) \? '#00FF88' : 'black', fontWeight: 'bold', cursor: activeWashTypes.includes\('liquid'\) \? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: activeWashTypes.includes\('liquid'\) \? 0.6 : 1 }}\s+onClick=\{\(\) => triggerSweep\(customBase, 30, 'liquid'\)\}\s+disabled=\{activeWashTypes.includes\('liquid'\)\}\s+>\s+Liquid Fold\s+<\/button>/,
    `<button 
                className="cta-button"
                style={{ padding: '0.75rem', background: activeWashTypes.includes('liquid') ? 'rgba(0, 255, 136, 0.1)' : 'linear-gradient(90deg, #00FF88, #008855)', border: activeWashTypes.includes('liquid') ? '1px solid rgba(0, 255, 136, 0.3)' : 'none', borderRadius: '8px', color: activeWashTypes.includes('liquid') ? '#00FF88' : 'black', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.3s ease', boxShadow: activeWashTypes.includes('liquid') ? '0 0 20px rgba(0,255,136,0.4), inset 0 0 10px rgba(0,255,136,0.2)' : 'none' }}
                onClick={() => toggleWash(customBase, 'liquid')}
              >
                {activeWashTypes.includes('liquid') ? '■ STOP LIQUID' : 'Liquid Fold'}
              </button>`
);

// Ascender
code = code.replace(
    /<button\s+className="cta-button"\s+style={{ padding: '0.75rem', background: activeWashTypes.includes\('ascender'\) \? 'rgba\(255, 215, 0, 0.1\)' : 'linear-gradient\(90deg, #FFD700, #FF8C00\)', border: activeWashTypes.includes\('ascender'\) \? '1px solid rgba\(255, 215, 0, 0.3\)' : 'none', borderRadius: '8px', color: activeWashTypes.includes\('ascender'\) \? '#FFD700' : 'black', fontWeight: 'bold', cursor: activeWashTypes.includes\('ascender'\) \? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: activeWashTypes.includes\('ascender'\) \? 0.6 : 1 }}\s+onClick=\{\(\) => triggerSweep\(customBase, 30, 'ascender'\)\}\s+disabled=\{activeWashTypes.includes\('ascender'\)\}\s+>\s+Infinite Ascender\s+<\/button>/,
    `<button 
                className="cta-button"
                style={{ padding: '0.75rem', background: activeWashTypes.includes('ascender') ? 'rgba(255, 215, 0, 0.1)' : 'linear-gradient(90deg, #FFD700, #FF8C00)', border: activeWashTypes.includes('ascender') ? '1px solid rgba(255, 215, 0, 0.3)' : 'none', borderRadius: '8px', color: activeWashTypes.includes('ascender') ? '#FFD700' : 'black', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.3s ease', boxShadow: activeWashTypes.includes('ascender') ? '0 0 20px rgba(255,215,0,0.4), inset 0 0 10px rgba(255,215,0,0.2)' : 'none' }}
                onClick={() => toggleWash(customBase, 'ascender')}
              >
                {activeWashTypes.includes('ascender') ? '■ STOP ASCENDER' : 'Infinite Ascender'}
              </button>`
);

// Onboarding Modal triggerSweep to toggleWash
code = code.replace(
    /onInitiate=\{\(\) => triggerSweep\(customBase, 30, 'flashbang'\)\}/,
    `onInitiate={() => toggleWash(customBase, 'flashbang')}`
);

fs.writeFileSync('src/components/Studio.tsx', code);
console.log('Successfully patched Studio.tsx');
