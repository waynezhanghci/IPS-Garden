
import { randomRange, randomInt, degToRad, easeOutQuad, easeOutBack, clamp } from '../utils/math';

export class Daisy {
  x: number;
  y: number; 
  
  finalHeight: number;
  petalCount: number;
  maxPetalLength: number;
  maxPetalWidth: number;
  stemControlPointOffset: number; 
  leafConfig: { yPct: number; side: number; length: number; angle: number; width: number }[];
  petalAngles: number[];
  
  intrinsicScale: number; 
  tilt: number; 
  petalShapeProfile: number; 
  windPhase: number; 
  petalColor: string;
  seedRotation: number; 
  
  createdAt: number;
  scaleModifier: number; 
  
  // Maturity Logic
  lastMaturityTime: number; 
  maturityCount: number = 0;
  nextMaturityInterval: number = 10000; // Start at 10s

  static DROP_DURATION = 300; 
  static WAIT_DURATION = 1500; 
  static STEM_DURATION = 800;
  static BUD_DURATION = 400; 
  static BLOOM_DURATION = 600; 
  
  static TOTAL_GROWTH_PHASE = 300 + 1500 + 800 + 400 + 600; 

  static COLOR_STEM = '#96B16D';
  static COLOR_CENTER = '#F9A602';
  
  // Updated Palette: Pink-Blue, Pink-Green, Powder Pink, Soft Purple, Pink-Yellow
  static PASTEL_PALETTE = [
    '#BEE3F8', // 粉蓝色
    '#C6F6D5', // 粉绿色
    '#FBB6CE', // 粉红色
    '#E9D8FD', // 粉紫色
    '#FEEBC8', // 粉黄色
  ];

  constructor(x: number, y: number, scaleModifier: number = 1) {
    this.x = x;
    this.y = y;
    this.scaleModifier = scaleModifier;
    this.createdAt = Date.now();
    this.lastMaturityTime = this.createdAt + Daisy.TOTAL_GROWTH_PHASE;

    const colorIndex = randomInt(0, Daisy.PASTEL_PALETTE.length - 1);
    this.petalColor = Daisy.PASTEL_PALETTE[colorIndex];

    this.finalHeight = randomRange(35, 170); 
    this.intrinsicScale = randomRange(0.5, 1.5);
    
    const totalScale = this.scaleModifier * this.intrinsicScale;
    this.stemControlPointOffset = randomRange(-25, 25);
    this.petalCount = randomInt(8, 16); 
    this.tilt = randomRange(0.4, 0.8); 
    this.petalShapeProfile = Math.random(); 
    this.windPhase = Math.random() * Math.PI * 2;
    this.seedRotation = randomRange(-0.8, 0.8);

    const baseLen = randomRange(15, 30);
    const baseWid = randomRange(4, 11); 
    this.maxPetalLength = baseLen * totalScale; 
    this.maxPetalWidth = baseWid * totalScale; 
    
    this.petalAngles = [];
    const step = (Math.PI * 2) / this.petalCount;
    for(let i=0; i<this.petalCount; i++) {
        this.petalAngles.push((i * step) + randomRange(-0.2, 0.2)); 
    }

    const leafCount = randomInt(2, 4);
    this.leafConfig = [];
    for (let i = 0; i < leafCount; i++) {
      this.leafConfig.push({
        yPct: randomRange(0.2, 0.6), 
        side: Math.random() > 0.5 ? 1 : -1,
        length: randomRange(12, 28) * totalScale, 
        angle: randomRange(30, 70),
        width: randomRange(5, 10) * totalScale
      });
    }
  }

  isFullyGrown(currentTime: number): boolean {
    return (currentTime - this.createdAt) > Daisy.TOTAL_GROWTH_PHASE;
  }

  canMature(currentTime: number): boolean {
    if (!this.isFullyGrown(currentTime)) return false;
    if (this.maturityCount >= 10) return false;
    return (currentTime - this.lastMaturityTime) >= this.nextMaturityInterval;
  }

  markMatured(currentTime: number) {
    this.maturityCount++;
    this.lastMaturityTime = currentTime;
    this.nextMaturityInterval = (this.maturityCount + 1) * 10000;
  }

  updateAndDraw(ctx: CanvasRenderingContext2D, currentTime: number) {
    const age = currentTime - this.createdAt;
    const timeBeforeGrowth = Daisy.DROP_DURATION + Daisy.WAIT_DURATION;

    if (age < timeBeforeGrowth) {
      const dropAnimationTime = Math.min(age, Daisy.DROP_DURATION);
      this.drawSeed(ctx, dropAnimationTime);
    } else {
      const growthTime = age - timeBeforeGrowth;
      this.drawPlant(ctx, growthTime, currentTime);
    }
    return true; 
  }

  private drawSeed(ctx: CanvasRenderingContext2D, age: number) {
    const currentY = easeOutQuad(age, this.y - 20, 20, Daisy.DROP_DURATION);
    ctx.save();
    ctx.translate(this.x, currentY);
    ctx.rotate(this.seedRotation);
    ctx.fillStyle = '#E6C898'; 
    ctx.beginPath();
    ctx.moveTo(0, -6); 
    ctx.quadraticCurveTo(3, 0, 0, 6); 
    ctx.quadraticCurveTo(-3, 0, 0, -6); 
    ctx.fill();
    ctx.restore();
  }

  drawHead(ctx: CanvasRenderingContext2D, bloomProgress: number = 1) {
    ctx.save();
    ctx.scale(1, this.tilt);
    if (bloomProgress > 0) {
        ctx.fillStyle = this.petalColor;
        for (let i = 0; i < this.petalCount; i++) {
            ctx.save();
            ctx.rotate(this.petalAngles[i]);
            const pLen = this.maxPetalLength * bloomProgress;
            const pWid = this.maxPetalWidth * bloomProgress;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            const offset = 2 * bloomProgress * this.scaleModifier;
            const tipTaper = 0.5 + (this.petalShapeProfile * 0.4); 
            const baseBulge = 0.3 + ((1 - this.petalShapeProfile) * 0.2); 
            ctx.bezierCurveTo(-pWid, offset + pLen * baseBulge, -pWid * (1 - this.petalShapeProfile * 0.6), offset + pLen * tipTaper, 0, offset + pLen);
            ctx.bezierCurveTo(pWid * (1 - this.petalShapeProfile * 0.6), offset + pLen * tipTaper, pWid, offset + pLen * baseBulge, 0, 0);
            ctx.fill();
            ctx.restore();
        }
    }
    const centerSize = (4 + (bloomProgress * 1.5)) * this.scaleModifier * this.intrinsicScale;
    ctx.fillStyle = Daisy.COLOR_CENTER;
    ctx.beginPath();
    ctx.arc(0, 0, centerSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawPlant(ctx: CanvasRenderingContext2D, growthTime: number, currentTime: number) {
    const stemEnd = Daisy.STEM_DURATION;
    const budEnd = stemEnd + Daisy.BUD_DURATION;
    
    let currentHeight = 0;
    if (growthTime < stemEnd) {
      currentHeight = easeOutQuad(growthTime, 0, this.finalHeight, stemEnd);
    } else {
      currentHeight = this.finalHeight;
    }

    const revealProgress = clamp(currentHeight / this.finalHeight, 0, 1);
    const t = currentTime * 0.0008; 
    const baseSway = Math.sin(t + (this.x * 0.002) + this.windPhase);
    const secondarySway = Math.sin(t * 2.5 + (this.x * 0.01)) * 0.5;
    const windForce = baseSway + secondarySway;
    const swaySensitivity = Math.pow(this.finalHeight, 1.5) / 100;
    const currentSway = windForce * swaySensitivity * revealProgress;

    const startX = this.x;
    const startY = this.y;
    const endX = this.x + (this.stemControlPointOffset * 0.6) + currentSway;
    const endY = this.y - this.finalHeight;
    const cpX = this.x + this.stemControlPointOffset + (currentSway * 0.4);
    const cpY = this.y - (this.finalHeight * 0.5);

    const qT = revealProgress;
    const mt = 1-qT;
    const currentTipX = (mt*mt)*startX + 2*mt*qT*cpX + (qT*qT)*endX;
    const currentTipY = (mt*mt)*startY + 2*mt*qT*cpY + (qT*qT)*endY;

    // Draw Stem
    const segments = 10;
    const baseWidth = (3 + (this.finalHeight / 50)) * this.intrinsicScale * this.scaleModifier;
    ctx.fillStyle = Daisy.COLOR_STEM;
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
        const segT = (i / segments) * revealProgress;
        const smt = 1-segT;
        const px = (smt*smt)*startX + 2*smt*segT*cpX + (segT*segT)*endX;
        const py = (smt*smt)*startY + 2*smt*segT*cpY + (segT*segT)*endY;
        const tx = 2*smt*(cpX - startX) + 2*segT*(endX - cpX);
        const ty = 2*smt*(cpY - startY) + 2*segT*(endY - cpY);
        const len = Math.hypot(tx, ty);
        const nx = -ty / len;
        const ny = tx / len;
        const w = baseWidth * (1 - segT * 0.5);
        if (i === 0) ctx.moveTo(px + nx * (w/2), py + ny * (w/2));
        else ctx.lineTo(px + nx * (w/2), py + ny * (w/2));
    }
    for (let i = segments; i >= 0; i--) {
        const segT = (i / segments) * revealProgress;
        const smt = 1-segT;
        const px = (smt*smt)*startX + 2*smt*segT*cpX + (segT*segT)*endX;
        const py = (smt*smt)*startY + 2*smt*segT*cpY + (segT*segT)*endY;
        const tx = 2*smt*(cpX - startX) + 2*segT*(endX - cpX);
        const ty = 2*smt*(cpY - startY) + 2*segT*(endY - cpY);
        const len = Math.hypot(tx, ty);
        const nx = -ty / len;
        const ny = tx / len;
        const w = baseWidth * (1 - segT * 0.5);
        ctx.lineTo(px - nx * (w/2), py - ny * (w/2));
    }
    ctx.closePath();
    ctx.fill();

    // Draw Leaves
    this.leafConfig.forEach(leaf => {
        if (revealProgress > leaf.yPct) {
            const leafGrowth = clamp((revealProgress - leaf.yPct) / 0.2, 0, 1);
            const lt = leaf.yPct;
            const mlt = 1-lt;
            const attachX = (mlt*mlt)*startX + 2*mlt*lt*cpX + (lt*lt)*endX;
            const attachY = (mlt*mlt)*startY + 2*mlt*lt*cpY + (lt*lt)*endY;
            const currentLeafLen = leaf.length * easeOutBack(leafGrowth, 0, 1, 1);
            ctx.save();
            ctx.translate(attachX, attachY);
            const baseAngle = leaf.side === 1 ? -leaf.angle : 180 + leaf.angle;
            ctx.rotate(degToRad(baseAngle));
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(currentLeafLen * 0.4, -leaf.width, currentLeafLen, -leaf.width * 0.2);
            ctx.quadraticCurveTo(currentLeafLen * 0.4, leaf.width * 0.6, 0, 0);
            ctx.fill();
            ctx.restore();
        }
    });

    // Draw Bloom
    if (growthTime > stemEnd) {
        const bloomTime = growthTime - budEnd;
        const bloomProgress = bloomTime > 0 ? easeOutBack(Math.min(bloomTime, Daisy.BLOOM_DURATION), 0, 1, Daisy.BLOOM_DURATION, 2.0) : 0;
        const budScale = growthTime - stemEnd < Daisy.BUD_DURATION ? easeOutBack(growthTime - stemEnd, 0, 1, Daisy.BUD_DURATION) : 1;

        ctx.save();
        ctx.translate(currentTipX, currentTipY);
        const tangentX = 2 * (endX - cpX);
        const tangentY = 2 * (endY - cpY);
        ctx.rotate(Math.atan2(tangentY, tangentX) + Math.PI / 2);
        ctx.scale(budScale, budScale);
        this.drawHead(ctx, bloomProgress);
        ctx.restore();
    }
  }

  getTipPosition(currentTime: number) {
    const age = currentTime - this.createdAt;
    const timeBeforeGrowth = Daisy.DROP_DURATION + Daisy.WAIT_DURATION;
    if (age < timeBeforeGrowth) return { x: this.x, y: this.y };

    const stemEnd = Daisy.STEM_DURATION;
    const growthTime = age - timeBeforeGrowth;
    const revealProgress = clamp(growthTime / stemEnd, 0, 1);

    const t = currentTime * 0.0008; 
    const baseSway = Math.sin(t + (this.x * 0.002) + this.windPhase);
    const secondarySway = Math.sin(t * 2.5 + (this.x * 0.01)) * 0.5;
    const windForce = baseSway + secondarySway;
    const swaySensitivity = Math.pow(this.finalHeight, 1.5) / 100;
    const currentSway = windForce * swaySensitivity * revealProgress;

    const startX = this.x;
    const startY = this.y;
    const endX = this.x + (this.stemControlPointOffset * 0.6) + currentSway;
    const endY = this.y - this.finalHeight;
    const cpX = this.x + this.stemControlPointOffset + (currentSway * 0.4);
    const cpY = this.y - (this.finalHeight * 0.5);

    const qT = revealProgress;
    const mt = 1-qT;
    return {
      x: (mt*mt)*startX + 2*mt*qT*cpX + (qT*qT)*endX,
      y: (mt*mt)*startY + 2*mt*qT*cpY + (qT*qT)*endY
    };
  }
}
