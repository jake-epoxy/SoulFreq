const fs = require('fs');
let code = fs.readFileSync('src/hooks/useAudioEngine.ts', 'utf8');

code = code.replace('const activeWashesRef = useRef<{id: string, type: string, startOffset: number, duration: number, startFreq: number}[]>([]);', 'const activeWashesRef = useRef<{id: string, type: string, startOffset: number, duration: number, startFreq: number, nodes?: AudioNode[], washMasterGain?: GainNode}[]>([]);');

code = code.replace('const { type, startFreq, id } = wash as any;', 'const { type, startFreq, id } = wash;');

code = code.replace('const existingWashIndex = activeWashesRef.current.findIndex((w: any) => w.type === type);', 'const existingWashIndex = activeWashesRef.current.findIndex((w) => w.type === type);');

code = code.replace('const wash = activeWashesRef.current[existingWashIndex] as any;', 'const wash = activeWashesRef.current[existingWashIndex];');

code = code.replace('wash.nodes.forEach((node: any) => { try { node.disconnect(); } catch { /* ignore */ } });', 'wash.nodes?.forEach((node: AudioNode) => { try { node.disconnect(); } catch { /* ignore */ } });');

code = code.replace(/wash\.washMasterGain\.gain\.cancelScheduledValues\(now\);/g, 'wash.washMasterGain?.gain.cancelScheduledValues(now);');
code = code.replace(/wash\.washMasterGain\.gain\.setValueAtTime\(wash\.washMasterGain\.gain\.value, now\);/g, 'if (wash.washMasterGain) wash.washMasterGain.gain.setValueAtTime(wash.washMasterGain.gain.value, now);');
code = code.replace(/wash\.washMasterGain\.gain\.linearRampToValueAtTime\(0\.0001, now \+ 2\);/g, 'wash.washMasterGain?.gain.linearRampToValueAtTime(0.0001, now + 2);');
code = code.replace(/try \{ wash\.washMasterGain\.disconnect\(\); \} catch \{ \/\* ignore \*\/ \}/g, 'try { wash.washMasterGain?.disconnect(); } catch { /* ignore */ }');

code = code.replace('activeWashesRef.current.push({ id: washId, type, startOffset: now, startFreq, nodes: activeNodes, washMasterGain } as any);', 'activeWashesRef.current.push({ id: washId, type, startOffset: now, startFreq, duration: 0, nodes: activeNodes as AudioNode[], washMasterGain });');

fs.writeFileSync('src/hooks/useAudioEngine.ts', code);
