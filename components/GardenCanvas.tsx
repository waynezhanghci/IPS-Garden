import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Daisy } from '../classes/Daisy';
import { Particle } from '../classes/Particle';
import { GestureRecognizer, FilesetResolver } from '@mediapipe/tasks-vision';

interface GardenCanvasProps {
    onUpdateCount: (count: number) => void;
    enableGestures: boolean;
}

const MAX_DAISIES = 500; 

class FloatingWord {
    x: number; y: number; text: string;
    life: number = 1.0;
    decay: number = 0.015;
    vy: number = -1.5;
    color: string = 'rgba(255, 255, 255, ';

    constructor(x: number, y: number) {
        this.x = x; this.y = y;
        const words = ['+Happy', '+Lucky', '+Cheers', '+AI', 'ima', 'sogou', 'QB'];
        this.text = words[Math.floor(Math.random() * words.length)];
    }
    update() { this.y += this.vy; this.life -= this.decay; this.vy *= 0.98; }
    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.font = '900 28px sans-serif';
        ctx.fillStyle = this.color + this.life + ')';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(255,255,255,0.2)';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

class MaturityEssence {
    startTime: number; duration: number = 1800;
    sourceDaisy: Daisy; originX: number; originY: number; targetX: number; targetY: number; delay: number;
    constructor(daisy: Daisy, startX: number, startY: number, targetX: number, targetY: number, delay: number = 500) {
        this.sourceDaisy = daisy; this.originX = startX; this.originY = startY;
        this.targetX = targetX; this.targetY = targetY; this.delay = delay;
        this.startTime = Date.now();
    }
    updateAndDraw(ctx: CanvasRenderingContext2D, now: number): boolean {
        const age = now - this.startTime;
        if (age < this.delay) return true;
        const elapsed = age - this.delay;
        const p = Math.min(elapsed / this.duration, 1);
        const ease = 1 - Math.pow(1 - p, 4);
        const midX = (this.originX + this.targetX) / 2;
        const midY = (this.originY + this.targetY) / 2 - 250;
        const q1x = this.originX + (midX - this.originX) * ease;
        const q1y = this.originY + (midY - this.originY) * ease;
        const q2x = midX + (this.targetX - midX) * ease;
        const q2y = midY + (this.targetY - midY) * ease;
        const x = q1x + (q2x - q1x) * ease;
        const y = q1y + (q2y - q1y) * ease;
        const scale = (0.7 - p * 0.3);
        ctx.save();
        ctx.translate(x, y); ctx.scale(scale, scale);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.fill();
        this.sourceDaisy.drawHead(ctx, 1.0);
        ctx.restore();
        return p < 1;
    }
}

interface HandCursor { x: number; y: number; isPinching: boolean; }

export const GardenCanvas: React.FC<GardenCanvasProps> = ({ onUpdateCount, enableGestures }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const daisiesRef = useRef<Daisy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const essencesRef = useRef<MaturityEssence[]>([]);
  const wordsRef = useRef<FloatingWord[]>([]);
  const totalCountRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const handCursorsRef = useRef<HandCursor[]>([]);
  const lastPlantTimesRef = useRef<number[]>(new Array(10).fill(0));

  const addDaisy = useCallback((x: number, y: number) => {
    if (daisiesRef.current.length >= MAX_DAISIES) daisiesRef.current.shift();
    daisiesRef.current.push(new Daisy(x, y, 1.0));
  }, []);

  const triggerConfetti = (x: number, y: number) => {
    for(let i=0; i<20; i++) particlesRef.current.push(new Particle(x, y));
  };

  useEffect(() => {
    const loadModel = async () => {
        try {
            const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
            gestureRecognizerRef.current = await GestureRecognizer.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
                    delegate: "GPU"
                },
                runningMode: "VIDEO", numHands: 5
            });
            setIsModelLoaded(true);
        } catch (e) { console.error(e); }
    };
    loadModel();
  }, []);

  useEffect(() => {
    if (!isModelLoaded || !enableGestures) return;
    let stream: MediaStream | null = null;
    const start = async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (e) { console.error(e); }
    };
    start();
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, [enableGestures, isModelLoaded]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let frameId: number;

    const loop = () => {
        const now = Date.now();
        const v = videoRef.current;
        const recognizer = gestureRecognizerRef.current;

        // 手势检测逻辑
        if (enableGestures && v && recognizer && v.readyState >= 2 && v.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = v.currentTime;
            const res = recognizer.recognizeForVideo(v, now);
            const cursors: HandCursor[] = [];
            if (res.landmarks) {
                res.landmarks.forEach((lm, i) => {
                    const sx = (1 - lm[8].x) * window.innerWidth;
                    const sy = lm[8].y * window.innerHeight;
                    const isP = Math.hypot(lm[8].x - lm[4].x, lm[8].y - lm[4].y) < 0.08;
                    cursors.push({ x: sx, y: sy, isPinching: isP });
                    if (isP && now - (lastPlantTimesRef.current[i] || 0) > 400) {
                        addDaisy(sx, sy); lastPlantTimesRef.current[i] = now;
                    }
                });
            }
            handCursorsRef.current = cursors;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const tx = canvas.width - 104; const ty = 104;

        // 渲染逻辑
        daisiesRef.current.forEach(d => {
            d.updateAndDraw(ctx, now);
            if (d.canMature(now)) {
                const tip = d.getTipPosition(now);
                wordsRef.current.push(new FloatingWord(tip.x, tip.y - 30));
                essencesRef.current.push(new MaturityEssence(d, tip.x, tip.y, tx, ty));
                d.markMatured(now);
            }
        });

        essencesRef.current = essencesRef.current.filter(e => {
            const active = e.updateAndDraw(ctx, now);
            if (!active) {
                totalCountRef.current++;
                onUpdateCount(totalCountRef.current);
                triggerConfetti(tx, ty);
            }
            return active;
        });

        particlesRef.current = particlesRef.current.filter(p => { p.update(); p.draw(ctx); return p.life > 0; });
        wordsRef.current = wordsRef.current.filter(w => { w.update(); w.draw(ctx); return w.life > 0; });

        if (enableGestures) {
            handCursorsRef.current.forEach(c => {
                ctx.save(); ctx.font = '56px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.shadowBlur = 20; ctx.shadowColor = c.isPinching ? 'rgba(150,177,109,0.8)' : 'rgba(255,255,255,0.3)';
                ctx.translate(c.x, c.y); ctx.scale(c.isPinching ? 1.3 : 1, c.isPinching ? 1.3 : 1);
                ctx.fillText('🤏', 0, 0); ctx.restore();
            });
        }

        frameId = requestAnimationFrame(loop);
    };

    const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    handleResize();
    frameId = requestAnimationFrame(loop);
    return () => { window.removeEventListener('resize', handleResize); cancelAnimationFrame(frameId); };
  }, [enableGestures, onUpdateCount, addDaisy]);

  const handleInteract = (e: any) => {
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    if (x && y) addDaisy(x, y);
  };

  return (
    <div className="absolute inset-0">
        {/* 监控视口：宽度 w-40，位置在全屏按钮正上方 */}
        <video 
            ref={videoRef} 
            className={`fixed bottom-[108px] right-6 w-40 aspect-video object-cover rounded-2xl border-2 border-white/20 scale-x-[-1] z-50 pointer-events-none transition-opacity duration-500 ${enableGestures ? 'opacity-100' : 'opacity-0'}`} 
            autoPlay playsInline muted
        ></video>
        <canvas
            ref={canvasRef}
            className="w-full h-full block touch-none cursor-crosshair"
            onMouseDown={handleInteract}
            onTouchStart={handleInteract}
        />
    </div>
  );
};