import { useEffect, useRef } from 'react';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  opacity: number; size: number;
}

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles: Particle[] = [];
    let animId: number;
    let scanY = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // More particles, higher visibility
    for (let i = 0; i < 55; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.55 + 0.1,
        size: Math.random() * 2.5 + 0.8,
      });
    }

    let glowPulse = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle radial vignette from bottom-left (red glow origin)
      glowPulse += 0.012;
      const glowR = 0.5 + Math.sin(glowPulse) * 0.08;
      const radial = ctx.createRadialGradient(
        canvas.width * 0.15, canvas.height * 0.85, 0,
        canvas.width * 0.15, canvas.height * 0.85, canvas.width * glowR,
      );
      radial.addColorStop(0, 'rgba(120,0,0,0.12)');
      radial.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid — more visible
      ctx.strokeStyle = 'rgba(204,0,0,0.07)';
      ctx.lineWidth = 0.5;
      const gridSize = 44;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Scan line — stronger
      scanY = (scanY + 0.6) % canvas.height;
      const grad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      grad.addColorStop(0,   'rgba(204,0,0,0)');
      grad.addColorStop(0.5, 'rgba(204,0,0,0.11)');
      grad.addColorStop(1,   'rgba(204,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 30, canvas.width, 60);

      // Particles
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        // Larger particles get a glow
        if (p.size > 2) {
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          glow.addColorStop(0, `rgba(204,0,0,${p.opacity})`);
          glow.addColorStop(1, 'rgba(204,0,0,0)');
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(204,0,0,${p.opacity})`;
        ctx.fill();
      }

      // Corner HUD brackets — more prominent
      const corner = 28;
      ctx.strokeStyle = 'rgba(204,0,0,0.55)';
      ctx.lineWidth = 2;
      const corners = [
        [0, 0, corner, 0, 0, corner],
        [canvas.width, 0, canvas.width - corner, 0, canvas.width, corner],
        [0, canvas.height, corner, canvas.height, 0, canvas.height - corner],
        [canvas.width, canvas.height, canvas.width - corner, canvas.height, canvas.width, canvas.height - corner],
      ];
      for (const [x1, y1, x2, y2, x3, y3] of corners) {
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x3, y3);
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
