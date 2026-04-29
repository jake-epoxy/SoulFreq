/* eslint-disable react-hooks/purity */
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import './TheScience.css';

// ─── Formation Generators ───────────────────────────────────────
const PARTICLE_COUNT = 2000;

function generateSphere(count: number): Float32Array {
  const p = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 2.2;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    p[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    p[i * 3 + 2] = r * Math.cos(phi);
  }
  return p;
}

function generateTunnel(count: number): Float32Array {
  const p = new Float32Array(count * 3);
  const ringsPerParticle = 30;
  for (let i = 0; i < count; i++) {
    const ringIdx = Math.floor(i / ringsPerParticle);
    const angleInRing = ((i % ringsPerParticle) / ringsPerParticle) * Math.PI * 2;
    const radius = 1.2 + Math.sin(ringIdx * 0.4) * 0.4;
    const z = ringIdx * 0.35 - 8;
    p[i * 3] = Math.cos(angleInRing) * radius;
    p[i * 3 + 1] = Math.sin(angleInRing) * radius;
    p[i * 3 + 2] = z;
  }
  return p;
}

function generateWaves(count: number): Float32Array {
  const p = new Float32Array(count * 3);
  const half = Math.floor(count / 2);
  for (let i = 0; i < count; i++) {
    const t = (i % half) / half;
    const x = (t - 0.5) * 10;
    if (i < half) {
      p[i * 3] = x;
      p[i * 3 + 1] = Math.sin(x * 1.8) * 1.0 + 1.0;
      p[i * 3 + 2] = Math.cos(x * 2.5) * 0.15;
    } else {
      p[i * 3] = x;
      p[i * 3 + 1] = Math.sin(x * 2.1) * 1.0 - 1.0;
      p[i * 3 + 2] = Math.cos(x * 2.0) * 0.15;
    }
  }
  return p;
}

function generateCymatics(count: number): Float32Array {
  const p = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 * 12;
    const r = (i / count) * 3.0;
    const chladni = Math.sin(5 * angle) * Math.cos(3 * r) * 0.4;
    p[i * 3] = Math.cos(angle) * r * 0.7;
    p[i * 3 + 1] = chladni;
    p[i * 3 + 2] = Math.sin(angle) * r * 0.7;
  }
  return p;
}

function generateSingularity(count: number): Float32Array {
  const p = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Explode outward into a massive expanding shell
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 4.0 + Math.random() * 2.0;
    p[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    p[i * 3 + 2] = r * Math.cos(phi);
  }
  return p;
}

// ─── Audio Engine ───────────────────────────────────────────────
function useScienceAudio(started: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);
  const droneOscRef = useRef<OscillatorNode | null>(null);
  const binLeftRef = useRef<OscillatorNode | null>(null);
  const binRightRef = useRef<OscillatorNode | null>(null);
  const binGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!started) return;
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    // Main ambient drone
    const droneOsc = ctx.createOscillator();
    droneOsc.type = 'sine';
    droneOsc.frequency.value = 80;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0;
    droneOsc.connect(droneGain);
    droneGain.connect(ctx.destination);
    droneOsc.start();
    droneOscRef.current = droneOsc;
    droneGainRef.current = droneGain;

    // Binaural beat pair (stereo)
    const merger = ctx.createChannelMerger(2);
    const binGain = ctx.createGain();
    binGain.gain.value = 0;

    const oscL = ctx.createOscillator();
    oscL.type = 'sine';
    oscL.frequency.value = 200;
    oscL.connect(merger, 0, 0);
    oscL.start();

    const oscR = ctx.createOscillator();
    oscR.type = 'sine';
    oscR.frequency.value = 210;
    oscR.connect(merger, 0, 1);
    oscR.start();

    merger.connect(binGain);
    binGain.connect(ctx.destination);

    binLeftRef.current = oscL;
    binRightRef.current = oscR;
    binGainRef.current = binGain;

    return () => {
      droneOsc.stop();
      oscL.stop();
      oscR.stop();
      ctx.close();
    };
  }, [started]);

  const updateScroll = useCallback((offset: number) => {
    if (!droneGainRef.current || !droneOscRef.current || !ctxRef.current) return;
    const t = offset;
    const now = ctxRef.current.currentTime;

    // Drone: fades in gently over the full scroll (smooth interpolation)
    const targetGain = Math.min(t * 0.25, 0.12);
    droneGainRef.current.gain.setTargetAtTime(targetGain, now, 0.1);

    // Shift drone frequency per chapter (smooth glide between frequencies)
    let targetFreq = 77.83; // Schumann harmonic default
    if (t < 0.2) {
      targetFreq = 7.83 + 70;
    } else if (t < 0.4) {
      targetFreq = 80 + (t - 0.2) * 400;
    } else if (t < 0.6) {
      targetFreq = 100;
    } else if (t < 0.8) {
      targetFreq = 136.1; // OM frequency
    } else {
      targetFreq = 80;
    }
    droneOscRef.current.frequency.setTargetAtTime(targetFreq, now, 0.15);

    // Binaural: active only in chapter 3 (0.4 - 0.6) — smooth crossfade
    if (binGainRef.current) {
      let binTarget = 0;
      if (t > 0.35 && t < 0.65) {
        const chapterBlend = Math.min(1, Math.max(0, (t - 0.35) / 0.05));
        const fadeOut = Math.min(1, Math.max(0, (0.65 - t) / 0.05));
        binTarget = chapterBlend * fadeOut * 0.08;
      }
      binGainRef.current.gain.setTargetAtTime(binTarget, now, 0.1);
    }
  }, []);

  return { updateScroll };
}

// ─── Morphing Particle System ───────────────────────────────────
function MorphingParticles({ audioStarted }: { audioStarted: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const scroll = useScroll();
  const mouse = useRef({ x: 0, y: 0 });
  const { updateScroll } = useScienceAudio(audioStarted);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  const formations = useMemo(() => ({
    sphere: generateSphere(PARTICLE_COUNT),
    tunnel: generateTunnel(PARTICLE_COUNT),
    waves: generateWaves(PARTICLE_COUNT),
    cymatics: generateCymatics(PARTICLE_COUNT),
    singularity: generateSingularity(PARTICLE_COUNT),
  }), []);

  const positions = useMemo(() => new Float32Array(formations.sphere), [formations.sphere]);
  const colors = useMemo(() => {
    const c = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      c[i * 3] = 0; c[i * 3 + 1] = 0.94; c[i * 3 + 2] = 1.0;
    }
    return c;
  }, []);

  // Color targets per chapter: cyan, purple, mixed, gold, white
  const colorTargets = useMemo(() => ({
    cyan:   [0.0, 0.94, 1.0],
    purple: [0.48, 0.0, 1.0],
    mixed:  [0.3, 0.5, 1.0],
    gold:   [1.0, 0.84, 0.0],
    white:  [1.0, 1.0, 1.0],
  }), []);

  useFrame((state) => {
    if (!ref.current) return;
    const time = state.clock.getElapsedTime();
    const offset = scroll.offset;

    updateScroll(offset);

    const attr = ref.current.geometry.attributes.position;
    const arr = attr.array as Float32Array;
    const colAttr = ref.current.geometry.attributes.color;
    const colArr = colAttr.array as Float32Array;

    // Determine target formation and blend
    let targetA: Float32Array, targetB: Float32Array, blend: number;
    let colorA: number[], colorB: number[];

    if (offset < 0.2) {
      targetA = formations.sphere;
      targetB = formations.tunnel;
      blend = Math.max(0, (offset - 0.1) / 0.1);
      colorA = colorTargets.cyan;
      colorB = colorTargets.purple;
    } else if (offset < 0.4) {
      targetA = formations.tunnel;
      targetB = formations.waves;
      blend = Math.max(0, (offset - 0.3) / 0.1);
      colorA = colorTargets.purple;
      colorB = colorTargets.mixed;
    } else if (offset < 0.6) {
      targetA = formations.waves;
      targetB = formations.cymatics;
      blend = Math.max(0, (offset - 0.5) / 0.1);
      colorA = colorTargets.mixed;
      colorB = colorTargets.gold;
    } else if (offset < 0.8) {
      targetA = formations.cymatics;
      targetB = formations.singularity;
      blend = Math.max(0, (offset - 0.7) / 0.1);
      colorA = colorTargets.gold;
      colorB = colorTargets.white;
    } else {
      targetA = formations.singularity;
      targetB = formations.singularity;
      blend = 0;
      colorA = colorTargets.white;
      colorB = colorTargets.white;
    }

    const turbulenceStrength = Math.sin(blend * Math.PI) * 1.5;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const tA = targetA[i3];
      const tAy = targetA[i3 + 1];
      const tAz = targetA[i3 + 2];
      const tB = targetB[i3];
      const tBy = targetB[i3 + 1];
      const tBz = targetB[i3 + 2];

      const lx = tA + (tB - tA) * blend;
      const ly = tAy + (tBy - tAy) * blend;
      const lz = tAz + (tBz - tAz) * blend;

      // Turbulence during transitions
      const phase = i * 0.008 + time;
      const tx = Math.sin(phase * 1.3 + time * 0.5) * turbulenceStrength;
      const ty = Math.cos(phase * 0.9 + time * 0.3) * turbulenceStrength;
      const tz = Math.sin(phase * 1.7 + time * 0.7) * turbulenceStrength * 0.6;

      // Smooth lerp toward target
      arr[i3] += ((lx + tx) - arr[i3]) * 0.04;
      arr[i3 + 1] += ((ly + ty) - arr[i3 + 1]) * 0.04;
      arr[i3 + 2] += ((lz + tz) - arr[i3 + 2]) * 0.04;

      // Color interpolation
      colArr[i3] = colorA[0] + (colorB[0] - colorA[0]) * blend;
      colArr[i3 + 1] = colorA[1] + (colorB[1] - colorA[1]) * blend;
      colArr[i3 + 2] = colorA[2] + (colorB[2] - colorA[2]) * blend;
    }

    attr.needsUpdate = true;
    colAttr.needsUpdate = true;

    // Mouse parallax
    const targetX = mouse.current.x * 0.5;
    const targetY = mouse.current.y * 0.3;
    state.camera.position.x += (targetX - state.camera.position.x) * 0.03;
    state.camera.position.y += (targetY - state.camera.position.y) * 0.03;
    state.camera.lookAt(0, 0, 0);

    // Slow global rotation
    if (ref.current) {
      ref.current.rotation.y = time * 0.03;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={PARTICLE_COUNT}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={PARTICLE_COUNT}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.95}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

// ─── Chapter HTML Section ───────────────────────────────────────
function ChapterSection({ page, children }: { page: number; children: React.ReactNode }) {
  const scroll = useScroll();
  const ref = useRef<HTMLDivElement>(null);

  useFrame(() => {
    if (!ref.current) return;
    const pages = 6;
    const pageCenter = page / pages;
    const distance = Math.abs(scroll.offset - pageCenter);
    const opacity = Math.max(0, 1 - distance * 5);
    const translateY = distance * 60;
    ref.current.style.opacity = opacity.toString();
    ref.current.style.transform = `translateY(${translateY}px)`;
  });

  return (
    <div
      ref={ref}
      className="science-chapter"
      style={{ top: `${page * 100}vh`, opacity: page === 0 ? 1 : 0 }}
    >
      <div className="science-chapter-inner">
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────
interface TheScienceProps {
  onEnterStudio: () => void;
  session: boolean;
}

// ─── Stable scroll tracker (must be top-level, NOT inside TheScience) ─────
function ScrollTracker({ progressBarRef, scrollIndicatorRef }: { progressBarRef: React.RefObject<HTMLDivElement | null>, scrollIndicatorRef: React.RefObject<HTMLDivElement | null> }) {
  const scroll = useScroll();
  useFrame(() => {
    // Direct DOM manipulation — no setState, no re-renders
    const offset = scroll.offset;
    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${offset * 100}%`;
    }
    if (scrollIndicatorRef.current) {
      scrollIndicatorRef.current.style.opacity = offset < 0.05 ? '1' : '0';
      scrollIndicatorRef.current.style.pointerEvents = offset < 0.05 ? 'auto' : 'none';
    }
  });
  return null;
}

export default function TheScience({ onEnterStudio, session }: TheScienceProps) {
  const [audioStarted, setAudioStarted] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);

  return (
    <div className="science-wrapper">
      {/* Headphones Prompt */}
      {!audioStarted && (
        <div className="science-audio-prompt">
          <div className="prompt-icon">🎧</div>
          <h2>Put On Headphones</h2>
          <p>This experience uses spatial audio frequencies that require headphones to work correctly.</p>
          <button className="science-begin-btn" onClick={() => setAudioStarted(true)}>
            Begin The Descent
          </button>
        </div>
      )}

      <Canvas camera={{ position: [0, 0, 6], fov: 60 }} style={{ background: 'transparent' }} gl={{ antialias: false, powerPreference: 'low-power' }}>
        <fog attach="fog" args={['#020205', 5, 25]} />
        <ambientLight intensity={0.3} />

        <EffectComposer>
          <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.9} intensity={1.2} />
        </EffectComposer>

        <ScrollControls pages={6} damping={0.15}>
          <Scroll>
            <Stars radius={80} depth={50} count={2000} factor={3} saturation={0} fade speed={0.3} />
            <MorphingParticles audioStarted={audioStarted} />
            <ScrollTracker progressBarRef={progressBarRef} scrollIndicatorRef={scrollIndicatorRef} />
          </Scroll>

          <Scroll html style={{ width: '100%' }}>
            {/* ── Chapter 1: Schumann Resonance ── */}
            <ChapterSection page={0}>
              <span className="science-chapter-label">Chapter I</span>
              <h2 className="science-chapter-title">
                The Frequency<br />of <span className="text-gradient">Earth</span>
              </h2>
              <p className="science-chapter-body">
                In 1952, physicist W.O. Schumann mathematically predicted that the
                Earth's electromagnetic field resonates at a base frequency of
                <strong style={{ color: 'var(--brand-cyan)' }}> 7.83 Hz</strong> — now
                known as the Schumann Resonance. This frequency falls directly
                within the human alpha brainwave range, the state associated with
                deep relaxation and creative flow.
              </p>
              <span className="science-citation">
                📄 Schumann, W.O. (1952) — Zeitschrift für Naturforschung
              </span>
            </ChapterSection>

            {/* ── Chapter 2: CIA Gateway Process ── */}
            <ChapterSection page={1}>
              <span className="science-chapter-label">Chapter II — Declassified</span>
              <h2 className="science-chapter-title">
                CIA Project<br /><span className="text-gradient">Gateway</span>
              </h2>
              <p className="science-chapter-body">
                In 1983, U.S. Army Lt. Col. Wayne M. McDonnell authored a classified
                report for the CIA analyzing the "Gateway Process" — a technique
                using specific audio frequencies to systematically alter consciousness.
              </p>
              <blockquote className="science-quote">
                "The universe is composed of interacting energy fields.
                Electromagnetic radiation occupies only a tiny fraction of the
                spectrum. The brain, operating at certain frequencies, can
                interact with the universal hologram."
              </blockquote>
              <span className="science-citation">
                🔓 CIA-RDP96-00788R001700210016-5 (Declassified 2003)
              </span>
            </ChapterSection>

            {/* ── Chapter 3: Binaural Beats ── */}
            <ChapterSection page={2}>
              <span className="science-chapter-label">Chapter III — Interactive</span>
              <h2 className="science-chapter-title">
                Brainwave<br /><span className="text-gradient">Entrainment</span>
              </h2>
              <p className="science-chapter-body">
                When two slightly different frequencies are presented to each ear,
                the brain perceives a third "phantom" frequency — the mathematical
                difference between the two. This is a <strong style={{ color: 'var(--brand-cyan)' }}>binaural beat</strong>.
                Research demonstrates that sustained exposure synchronizes
                brainwave activity to this phantom frequency.
              </p>
              <div className="science-interact-hint">
                🎧 A 10 Hz alpha binaural beat is playing right now
              </div>
              <span className="science-citation">
                📄 Wahbeh et al. (2007) — J. Alternative & Complementary Medicine
              </span>
            </ChapterSection>

            {/* ── Chapter 4: Cymatics ── */}
            <ChapterSection page={3}>
              <span className="science-chapter-label">Chapter IV</span>
              <h2 className="science-chapter-title">
                Sound Made<br /><span className="text-gradient">Visible</span>
              </h2>
              <p className="science-chapter-body">
                In the 1960s, Swiss physician Hans Jenny coined the term
                "Cymatics" — the study of visible sound. By vibrating fine
                particles at specific frequencies, Jenny proved that sound creates
                precise geometric patterns. Different frequencies produce different
                sacred geometries. The same principle operates on your cells.
              </p>
              <span className="science-citation">
                📄 Jenny, H. (1967) — Cymatics: A Study of Wave Phenomena
              </span>
            </ChapterSection>

            {/* ── Chapter 5: The Reveal + CTA ── */}
            <ChapterSection page={4.5}>
              <div className="science-cta-section">
                <span className="science-chapter-label">Notice Something?</span>
                <h2 className="science-chapter-title">
                  You Just<br /><span className="text-gradient">Felt It.</span>
                </h2>
                <p className="science-cta-reveal">
                  A frequency has been playing since you pressed "Begin."
                  Notice how your breathing shifted. The subtle heaviness
                  leaving your chest. That's entrainment — your nervous system
                  synchronizing to an external oscillation.<br /><br />
                  <strong style={{ color: '#fff' }}>This is the technology behind Kinesus.</strong>
                </p>
                <button
                  className="science-cta-btn"
                  onClick={onEnterStudio}
                >
                  {session ? 'Enter the Studio →' : 'Start Your Session →'}
                </button>
              </div>
            </ChapterSection>
          </Scroll>
        </ScrollControls>
      </Canvas>

      {/* Scroll progress bar — updated via ref, no re-renders */}
      {audioStarted && (
        <div ref={progressBarRef} className="science-progress" style={{ width: '0%' }} />
      )}

      {/* Scroll indicator — visibility controlled via ref */}
      {audioStarted && (
        <div ref={scrollIndicatorRef} className="science-scroll-indicator">
          <span>Scroll</span>
          <div className="scroll-arrow" />
        </div>
      )}
    </div>
  );
}
