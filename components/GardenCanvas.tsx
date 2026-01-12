import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Daisy } from '../classes/Daisy';
import { Particle } from '../classes/Particle';
import { GestureRecognizer, FilesetResolver } from '@mediapipe/tasks-vision';

interface GardenCanvasProps {
    onUpdateCount: (count: number) => void;
    enableGestures: boolean;
}

// 增加最大花朵限制到 500，以满足更茂盛的花园需求
const MAX_DAISIES = 500; 

class FloatingWord {
    x: number;
    y: number;
    text: string;
    life: number = 1.0;
    decay: number = 0.015;
    vy: number = -1.5;
    color: string = 'rgba(255, 255, 255, ';

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        // 包含 ima, sogou, QB 关键词
        const words = ['+Happy', '+Lucky', '+Cheers', '+AI', 'ima', 'sogou', 'QB'];
        this.text = words[Math.floor(Math.random() * words.length)];
    }

    update() {
        this.y += this.vy;
        this.life -= this.decay;
        this.vy *= 0.98;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        // 设置为特粗 (900)
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
    startTime: number;
    duration: number = 1800; 
    sourceDaisy: Daisy;
    originX: number;
    originY: number;
    targetX: number;
    targetY: number;
    delay: number;

    constructor(daisy: Daisy, startX: number, startY: number, targetX: number, targetY: number, delay: number = 500) {
        this.sourceDaisy = daisy;
        this.originX = startX;
        this.originY = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.delay = delay;
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
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 60, 0, Math.PI * 2);
        ctx.fill();

        this.sourceDaisy.drawHead(ctx, 1.0);
        ctx.restore();

        return p < 1;
    }
}

interface HandCursor {
    x: number;
    y: number;
    isPinching: boolean;
}

export const GardenCanvas: React.FC<GardenCanvasProps> = ({ onUpdateCount, enableGestures }) => {
  const activeCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const daisiesRef = useRef<Daisy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const essencesRef = useRef<MaturityEssence[]>([]);
  const wordsRef = useRef<FloatingWord[]>([]);
  const totalCountRef = useRef<number>(0);

  const requestRef = useRef<number | undefined>(undefined);
  const gestureLoopRef = useRef<number | undefined>(undefined);
  const lastVideoTimeRef = useRef<number>(-1);
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  
  // 支持多个手势的光标数组
  const handCursorsRef = useRef<HandCursor[]>([]);
  // 为每个手（最多支持10个）记录独立的种植时间
  const lastPlantTimesRef = useRef<number[]>(new Array(10).fill(0));

  const addDaisy = useCallback((x: number, y: number) => {
    if (daisiesRef.current.length >= MAX_DAISIES) {
        daisiesRef.current.shift();
    }
    const daisy = new Daisy(x, y, 1.0);
    daisiesRef.current.push(daisy);
  }, []);

  const triggerConfetti = (x: number, y: number, count: number = 20) => {
    for(let i=0; i<count; i++) {
        particlesRef.current.push(new Particle(x, y));
    }
  };

  useEffect(() => {
    const loadGestureModel = async () => {
        try {
            const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
            gestureRecognizerRef.current = await GestureRecognizer.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                numHands: 10 // 支持最多10个手
            });
            setIsModelLoaded(true);
        } catch (error) { console.error("Mediapipe load error:", error); }
    };
    loadGestureModel();
  }, []);

  useEffect(() => {
    if (!isModelLoaded) return;
    let localStream: MediaStream | null = null;
    
    const startWebcam = async () => {
        if (!enableGestures) return;
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            if (videoRef.current) {
                videoRef.current.srcObject = localStream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    predictWebcam();
                };
            }
        } catch (err) { console.error("Webcam error:", err); }
    };

    const stopWebcam = () => {
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        if (gestureLoopRef.current) cancelAnimationFrame(gestureLoopRef.current);
        handCursorsRef.current = [];
    };

    if (enableGestures) startWebcam(); else stopWebcam();
    return () => stopWebcam();
  }, [enableGestures, isModelLoaded]);

  const predictWebcam = () => {
      const video = videoRef.current;
      const recognizer = gestureRecognizerRef.current;
      if (!video || !recognizer || !video.srcObject || !enableGestures) return;
      
      const now = Date.now();
      if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;
          try {
            const results = recognizer.recognizeForVideo(video, now);
            const newCursors: HandCursor[] = [];
            
            if (results.landmarks && results.landmarks.length > 0) {
                results.landmarks.forEach((landmarks, index) => {
                    const indexTip = landmarks[8];
                    const thumbTip = landmarks[4];
                    const screenX = (1 - indexTip.x) * window.innerWidth;
                    const screenY = indexTip.y * window.innerHeight;
                    const pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
                    const isPinching = pinchDist < 0.08; 
                    
                    newCursors.push({ x: screenX, y: screenY, isPinching });
                    
                    // 即使是多个手，只要在数组范围内就支持独立识别
                    if (isPinching && now - (lastPlantTimesRef.current[index] || 0) > 400) {
                        addDaisy(screenX, screenY);
                        lastPlantTimesRef.current[index] = now;
                    }
                });
            }
            handCursorsRef.current = newCursors;
          } catch (e) {
              console.warn("Prediction error:", e);
          }
      }
      gestureLoopRef.current = requestAnimationFrame(predictWebcam);
  };

  const drawWatermark = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    const fontSize = Math.min(w, h) * 0.65;
    ctx.font = `900 ${fontSize}px "Helvetica Neue", "Helvetica", "Arial", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(w / 2, h / 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.018)';
    ctx.fillText('IPS', 0, 0);
    ctx.restore();
  };

  const animate = (time: number) => {
    const canvas = activeCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = Date.now();
    const targetX = canvas.width - 104; 
    const targetY = 104;

    drawWatermark(ctx, canvas.width, canvas.height);

    daisiesRef.current.forEach(daisy => {
        daisy.updateAndDraw(ctx, now);
        if (daisy.canMature(now)) {
            const tip = daisy.getTipPosition(now);
            wordsRef.current.push(new FloatingWord(tip.x, tip.y - 30));
            essencesRef.current.push(new MaturityEssence(daisy, tip.x, tip.y, targetX, targetY, 500));
            daisy.markMatured(now);
        }
    });

    essencesRef.current = essencesRef.current.filter(ess => {
        const alive = ess.updateAndDraw(ctx, now);
        if (!alive) {
            totalCountRef.current++;
            onUpdateCount(totalCountRef.current);
            triggerConfetti(targetX, targetY, 20);
        }
        return alive;
    });

    wordsRef.current = wordsRef.current.filter(word => {
        word.update();
        word.draw(ctx);
        return word.life > 0;
    });

    particlesRef.current = particlesRef.current.filter(p => {
        p.update();
        p.draw(ctx);
        return p.life > 0;
    });

    // 绘制所有活跃的手势光标
    if (enableGestures && handCursorsRef.current.length > 0) {
        handCursorsRef.current.forEach(cursor => {
            const { x, y, isPinching } = cursor;
            ctx.save();
            ctx.font = '56px serif'; 
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            ctx.shadowBlur = 20;
            ctx.shadowColor = isPinching ? 'rgba(150, 177, 109, 0.8)' : 'rgba(255, 255, 255, 0.3)';
            
            const scale = isPinching ? 1.3 : 1.0;
            ctx.translate(x, y);
            ctx.scale(scale, scale);
            ctx.fillText('🤏', 0, 0);
            ctx.restore();
        });
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const handleResize = () => {
      if (activeCanvasRef.current) {
        activeCanvasRef.current.width = window.innerWidth;
        activeCanvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [enableGestures]);

  const handleManualClick = (e: any) => {
      const x = e.clientX || (e.touches && e.touches[0].clientX);
      const y = e.clientY || (e.touches && e.touches[0].clientY);
      if (x && y) addDaisy(x, y);
  };

  return (
    <div className="w-full h-full relative cursor-crosshair">
        <video 
            ref={videoRef} 
            className={`fixed bottom-6 right-6 w-48 h-36 object-cover rounded-2xl border-2 border-white/20 scale-x-[-1] z-50 pointer-events-none transition-opacity duration-500 ${enableGestures ? 'opacity-100' : 'opacity-0'}`} 
            autoPlay 
            playsInline 
            muted
        ></video>
        <canvas
            ref={activeCanvasRef}
            className="absolute top-0 left-0 w-full h-full touch-none"
            onClick={handleManualClick}
            onTouchStart={handleManualClick}
        />
    </div>
  );
};
