import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function ParticleSphere() {
  const ref = useRef<THREE.Points>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const innerSphereRef = useRef<THREE.Mesh>(null);
  
  // Global mouse tracking (bypasses z-index blocking issues)
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      // Normalize to -1 to +1
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Generate random points for the inner resonance particles
  const count = 4000;
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

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (ref.current) {
      ref.current.rotation.y = time * 0.05;
      ref.current.rotation.z = time * 0.02;
    }
    
    if (sphereRef.current) {
      sphereRef.current.rotation.x = time * 0.08;
      sphereRef.current.rotation.y = time * 0.12;
      const scale = 1 + Math.sin(time * 1.5) * 0.03;
      sphereRef.current.scale.set(scale, scale, scale);
    }

    if (innerSphereRef.current) {
      innerSphereRef.current.rotation.x = -time * 0.1;
      innerSphereRef.current.rotation.y = -time * 0.15;
    }
    
    // Smooth camera movement using global mouse ref
    const targetX = (mouse.current.x * Math.PI) / 8;
    const targetY = (mouse.current.y * Math.PI) / 8;
    
    state.camera.position.x += (targetX - state.camera.position.x) * 0.05;
    state.camera.position.y += (targetY - state.camera.position.y) * 0.05;
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <group>
      {/* Outer Geometric Wireframe (Cyan) */}
      <Sphere ref={sphereRef} args={[2.5, 32, 32]}>
        <meshBasicMaterial 
          color="#00f0ff" 
          wireframe 
          transparent 
          opacity={0.12} 
          blending={THREE.AdditiveBlending} 
        />
      </Sphere>
      
      {/* Inner Geometric Wireframe (Purple) */}
      <Sphere ref={innerSphereRef} args={[2.0, 16, 16]}>
        <meshBasicMaterial 
          color="#7a00ff" 
          wireframe 
          transparent 
          opacity={0.15} 
          blending={THREE.AdditiveBlending} 
        />
      </Sphere>

      {/* Resonance Particles (White / Cyan mix) */}
      <Points ref={ref} positions={positions} stride={3}>
        <PointMaterial
          transparent
          color="#88ffff"
          size={0.025}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </Points>
    </group>
  );
}

export default function ResonanceSphere() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
      {/* eventSource connects the mouse events to the whole screen even if canvas is in background */}
      <Canvas 
        camera={{ position: [0, 0, 7], fov: 60 }} 
        style={{ background: 'transparent' }}
      >
        <fog attach="fog" args={['#05050A', 3, 12]} />
        <ambientLight intensity={0.5} />
        <ParticleSphere />
      </Canvas>
    </div>
  );
}
