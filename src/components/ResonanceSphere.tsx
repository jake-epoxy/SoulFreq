import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Points, PointMaterial, ScrollControls, Scroll, useScroll, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity } from 'lucide-react';

function ParticleSphere() {
  const ref = useRef<THREE.Points>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const innerSphereRef = useRef<THREE.Mesh>(null);
  const starsRef = useRef<THREE.Group>(null);
  
  const scroll = useScroll();
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const count = 3000;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.6 + Math.random() * 0.8;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, [count]);

  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const offset = scroll.offset; // 0 to 1
    
    // Starfield Parallax Warp (Flying through space)
    if (starsRef.current) {
      starsRef.current.position.z = offset * 40; 
      starsRef.current.rotation.z = time * 0.05 + offset * Math.PI;
    }

    if (groupRef.current) {
      groupRef.current.position.y = offset * 2;
      groupRef.current.position.z = offset * -5;
      const scaleBase = 1 + Math.sin(offset * Math.PI) * 1.5;
      groupRef.current.scale.set(scaleBase, scaleBase, scaleBase);
      groupRef.current.rotation.x = offset * Math.PI * 2;
    }

    if (ref.current) {
      ref.current.rotation.y = time * 0.05 + offset * 2;
      ref.current.rotation.z = time * 0.02;
    }
    
    if (sphereRef.current) {
      sphereRef.current.rotation.x = time * 0.08;
      sphereRef.current.rotation.y = time * 0.12;
      const pulse = 1 + Math.sin(time * 1.5) * 0.03;
      sphereRef.current.scale.set(pulse, pulse, pulse);
    }

    if (innerSphereRef.current) {
      innerSphereRef.current.rotation.x = -time * 0.1;
      innerSphereRef.current.rotation.y = -time * 0.15;
    }
    
    const targetX = (mouse.current.x * Math.PI) / 8;
    const targetY = (mouse.current.y * Math.PI) / 8;
    state.camera.position.x += (targetX - state.camera.position.x) * 0.05;
    state.camera.position.y += (targetY - state.camera.position.y) * 0.05;
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <group ref={starsRef}>
        <Stars radius={50} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      </group>
      <group ref={groupRef}>
        <Sphere ref={sphereRef} args={[2.5, 32, 32]}>
          {/* Multiply colors to trigger Bloom threshold */}
          <meshBasicMaterial color={[0, 2.4, 2.55]} wireframe transparent opacity={0.15} blending={THREE.AdditiveBlending} />
        </Sphere>
        <Sphere ref={innerSphereRef} args={[2.0, 16, 16]}>
          <meshBasicMaterial color={[1.2, 0, 2.55]} wireframe transparent opacity={0.2} blending={THREE.AdditiveBlending} />
        </Sphere>
        <Points ref={ref} positions={positions} stride={3}>
          <PointMaterial transparent color={[2, 2, 2]} size={0.03} sizeAttenuation={true} depthWrite={false} blending={THREE.AdditiveBlending} />
        </Points>
      </group>
    </>
  );
}

function HTMLSection({ page, children }: { page: number, children: React.ReactNode }) {
  const scroll = useScroll();
  const ref = useRef<HTMLDivElement>(null);

  useFrame(() => {
    if (ref.current) {
      const pageOffset = page / 2;
      const distance = Math.abs(scroll.offset - pageOffset);
      const opacity = Math.max(0, 1 - distance * 3);
      ref.current.style.opacity = opacity.toString();
      ref.current.style.transform = `translateY(${distance * 50}px)`;
    }
  });

  return (
    <div ref={ref} style={{ position: 'absolute', top: `${page * 100}vh`, width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: page === 0 ? 1 : 0 }}>
      {children}
    </div>
  );
}

interface ResonanceSphereProps {
  onStart: () => void;
}

export default function ResonanceSphere({ onStart }: ResonanceSphereProps) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 10, background: '#020205' }}>
      <Canvas camera={{ position: [0, 0, 7], fov: 60 }} style={{ background: 'transparent' }}>
        <fog attach="fog" args={['#020205', 3, 15]} />
        <ambientLight intensity={0.5} />
        
        {/* Post Processing Pipeline for Cinematic Wow Factor */}
        <EffectComposer>
          <Bloom luminanceThreshold={1} luminanceSmoothing={0.9} intensity={2} />
          <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.002, 0.002)} />
        </EffectComposer>

        <ScrollControls pages={3} damping={0.25}>
          <Scroll>
            <ParticleSphere />
          </Scroll>

          <Scroll html style={{ width: '100%' }}>
            <HTMLSection page={0}>
              <div className="hero-content">
                <div className="badge glass-panel" style={{ marginBottom: '2rem' }}>
                  <Activity size={16} className="badge-icon" />
                  <span>The Kinetic Protocol</span>
                </div>
                <h1 className="hero-title">
                  Discover Your <span className="text-gradient">Frequency</span><br />
                  Prescription.
                </h1>
                <p className="hero-subtitle">
                  Scroll down to initialize the bio-resonance engine.
                </p>
              </div>
            </HTMLSection>

            <HTMLSection page={1}>
              <div className="hero-content">
                <h2 className="hero-title" style={{ fontSize: '3rem' }}>
                  Rewire Your <span className="text-gradient">Nervous System</span>
                </h2>
                <p className="hero-subtitle" style={{ maxWidth: '800px', fontSize: '1.2rem' }}>
                  Calibrate your mind, body, and spirit with scientifically backed binaural beats, ambient soundscapes, and ancient solfeggio frequencies. 
                </p>
              </div>
            </HTMLSection>

            <HTMLSection page={2}>
              <div className="hero-content">
                <h2 className="hero-title" style={{ fontSize: '4rem', marginBottom: '3rem' }}>
                  Ready to <span className="text-gradient">Sync</span>?
                </h2>
                <button onClick={onStart} className="cta-button glass-panel" style={{ pointerEvents: 'auto' }}>
                  Start Your Session
                </button>
              </div>
            </HTMLSection>
          </Scroll>
        </ScrollControls>
      </Canvas>
    </div>
  );
}
