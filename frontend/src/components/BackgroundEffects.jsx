import { useEffect, useState } from 'react';

const BackgroundEffects = () => {
  const [particles, setParticles] = useState([]);
  const [runes, setRunes] = useState([]);

  useEffect(() => {
    // Generate subtle floating particles
    const tempParticles = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${Math.random() * 3 + 1.5}px`,
      delay: `${Math.random() * 10}s`,
      duration: `${Math.random() * 15 + 12}s`,
      opacity: Math.random() * 0.35 + 0.15
    }));
    setParticles(tempParticles);

    // Subtle spiritual and Solo Leveling energy runes/glyphs
    const glyphs = ['ॐ', 'क्रीं', 'ह्रीं', 'श्रीं', '𐎓', '𐎔', '𐎕', '𐎖', '𐎗', '𐎘', '𐎙', '𐎚', '𐎛', '𐎜'];
    const tempRunes = Array.from({ length: 10 }).map((_, i) => ({
      id: i,
      char: glyphs[Math.floor(Math.random() * glyphs.length)],
      left: `${Math.random() * 90 + 5}%`,
      top: `${Math.random() * 90 + 5}%`,
      fontSize: `${Math.random() * 10 + 10}px`,
      delay: `${Math.random() * 12}s`,
      duration: `${Math.random() * 18 + 18}s`
    }));
    setRunes(tempRunes);
  }, []);

  return (
    <div className="solo-monarch-bg-container">
      {/* Soft Blue & Purple Glow / Aura Layers */}
      <div className="glow-aura-blue"></div>
      <div className="glow-aura-purple"></div>

      {/* Deity Watermark */}
      <div className="deity-watermark"></div>

      {/* Dark Overlay Layer above background to ensure high contrast and readability */}
      <div className="dark-overlay-layer"></div>

      {/* Light Energy Mist */}
      <div className="energy-mist-container">
        <div className="mist-cloud mist-1"></div>
        <div className="mist-cloud mist-2"></div>
      </div>

      {/* Floating Particles */}
      <div className="particles-container">
        {particles.map((p) => (
          <div
            key={p.id}
            className="floating-particle"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: p.duration,
              opacity: p.opacity
            }}
          />
        ))}
      </div>

      {/* Subtle Rune Effects */}
      <div className="runes-container">
        {runes.map((r) => (
          <div
            key={r.id}
            className="faint-rune"
            style={{
              left: r.left,
              top: r.top,
              fontSize: r.fontSize,
              animationDelay: r.delay,
              animationDuration: r.duration
            }}
          >
            {r.char}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BackgroundEffects;
