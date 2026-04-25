import './Hero.css';

interface HeroProps {
  onStart: () => void;
}
import ResonanceSphere from './ResonanceSphere';

export default function Hero({ onStart }: HeroProps) {
  return (
    <section className="hero-container" style={{ padding: 0, minHeight: '100vh', display: 'block' }}>
      {/* Background glow elements */}
      <div className="cyber-grid" style={{ zIndex: 1, pointerEvents: 'none' }}></div>
      <div className="glow-sphere cyan-glow" style={{ zIndex: 1, pointerEvents: 'none' }}></div>
      <div className="glow-sphere purple-glow" style={{ zIndex: 1, pointerEvents: 'none' }}></div>

      {/* 3D WebGL Background & Cinematic Scroll Journey */}
      <ResonanceSphere onStart={onStart} />
    </section>
  );
}
