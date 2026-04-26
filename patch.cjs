const fs = require('fs');

let code = fs.readFileSync('src/hooks/useAudioEngine.ts', 'utf8');

const triggerStart = code.indexOf('  const triggerSweep = useCallback(async (durationSeconds: number) => {');
const triggerEnd = code.indexOf('  // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [initEngine, isWashing]);\n');

if (triggerStart === -1 || triggerEnd === -1) {
    console.error("Could not find triggerSweep");
    process.exit(1);
}

const replacement = fs.readFileSync('scratch_trigger.txt', 'utf8');

code = code.substring(0, triggerStart) + replacement + code.substring(triggerEnd + 95);

// Fix the return statement
code = code.replace(
    'return { isPlaying, isWashing, togglePlay,',
    'return { isPlaying, isWashing, activeWashType, getActiveWashData, togglePlay,'
);

fs.writeFileSync('src/hooks/useAudioEngine.ts', code);
console.log("Patched successfully");
