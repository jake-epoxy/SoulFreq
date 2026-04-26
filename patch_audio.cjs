const fs = require('fs');

const oldAudio = fs.readFileSync('old_audio.ts', 'utf8');
const currentAudio = fs.readFileSync('src/hooks/useAudioEngine.ts', 'utf8');

// Extract old triggerSweep
const startMatch = oldAudio.indexOf('const triggerSweep = useCallback(async (startFreq: number, durationSeconds: number, type: \\\'euphoric\\\' | \\\'flashbang\\\' | \\\'liquid\\\' | \\\'ascender\\\' = \\\'euphoric\\\') => {');
const endMatch = oldAudio.indexOf('return { isPlaying, isWashing,', startMatch);
const oldTriggerSweepStr = oldAudio.substring(startMatch, endMatch);

// Add states
const statesStr = `const [isWashing, setIsWashing] = useState(false);
  const [activeWashType, setActiveWashType] = useState<'euphoric' | 'flashbang' | 'liquid' | 'ascender' | null>(null);
  const [washStartTime, setWashStartTime] = useState<number | null>(null);

  const activeWashRef = useRef<{type: string, startOffset: number, duration: number} | null>(null);

  const getActiveWashData = useCallback(() => {
     if (!audioCtxRef.current || !activeWashRef.current) return null;
     const elapsed = audioCtxRef.current.currentTime - activeWashRef.current.startOffset;
     if (elapsed >= activeWashRef.current.duration) return null;
     return { type: activeWashRef.current.type, elapsed, duration: activeWashRef.current.duration };
  }, []);

  `;

let modifiedTriggerSweep = oldTriggerSweepStr.replace('setIsWashing(true);', 'setIsWashing(true);\n    setActiveWashType(type);\n    setWashStartTime(Date.now());\n    activeWashRef.current = { type, startOffset: now, duration: durationSeconds };');
modifiedTriggerSweep = modifiedTriggerSweep.replace('setIsWashing(false);', 'setIsWashing(false);\n        setActiveWashType(null);\n        setWashStartTime(null);\n        activeWashRef.current = null;');

// In currentAudio, find where triggerSweep starts
const currentStartMatch = currentAudio.indexOf('const [isWashing, setIsWashing] = useState(false);');
const currentEndMatch = currentAudio.indexOf('return { isPlaying, isWashing,', currentStartMatch);

let newCurrentAudio = currentAudio.substring(0, currentStartMatch) + statesStr + modifiedTriggerSweep + currentAudio.substring(currentEndMatch);

newCurrentAudio = newCurrentAudio.replace(
  'return { isPlaying, isWashing, togglePlay,',
  'return { isPlaying, isWashing, activeWashType, getActiveWashData, togglePlay,'
);

fs.writeFileSync('src/hooks/useAudioEngine.ts', newCurrentAudio);
console.log('patched');
