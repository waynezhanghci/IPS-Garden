import { randomRange, degToRad } from '../utils/math';
import { Daisy } from './Daisy';

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  life: number;
  size: number;
  decayRate: number;
  
  // Sway properties
  swayFrequency: number;
  swayAmplitude: number;
  timeOffset: number;

  constructor(x: number, y: number) {
    // 1. Randomized Start Position (Cluster) to avoid point-source look
    this.x = x + randomRange(-15, 15);
    this.y = y + randomRange(-15, 15);
    
    // 2. Natural Spray Physics (Polar Coordinates)
    // Avoids rectangular shape artifact.
    // Target direction: Generally Left (180 deg).
    // Angle Range: 100 deg (Down-Left) to 260 deg (Up-Left) creates a wide natural fan.
    const angle = degToRad(randomRange(100, 260));
    
    // Speed: Wide variance to create depth and layering.
    const speed = randomRange(12, 45);

    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    
    this.rotation = randomRange(0, 360);
    this.rotationSpeed = randomRange(-15, 15);
    
    const colorIndex = Math.floor(Math.random() * Daisy.PASTEL_PALETTE.length);
    this.color = Daisy.PASTEL_PALETTE[colorIndex];
    
    this.life = 1.0;
    this.size = randomRange(5, 10);
    
    // Slower decay allows particles to travel further across the screen
    this.decayRate = randomRange(0.005, 0.015);
    
    this.swayFrequency = randomRange(0.05, 0.2);
    this.swayAmplitude = randomRange(0.5, 2.0);
    this.timeOffset = Math.random() * 1000;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    
    // Horizontal Sway (Paper flutter effect)
    if (Math.abs(this.vx) < 15) { 
        this.x += Math.sin(this.timeOffset + (1 - this.life) * 10) * this.swayAmplitude;
    }

    // Gravity
    this.vy += 0.15;
    
    // Drag (Air Resistance)
    // Reduced drag (0.96) to maximize range and explosion feel
    this.vx *= 0.96;
    this.vy *= 0.96;
    
    this.rotation += this.rotationSpeed;
    this.rotationSpeed *= 0.98;

    this.life -= this.decayRate;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(degToRad(this.rotation));
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}