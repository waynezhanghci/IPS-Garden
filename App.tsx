import React, { useState, useEffect } from 'react';
import { GardenCanvas } from './components/GardenCanvas';

const App: React.FC = () => {
  const [flowerCount, setFlowerCount] = useState(0);
  const [gestureEnabled, setGestureEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleUpdateCount = (count: number) => {
    setFlowerCount(count);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  return (
    <div className="w-screen h-screen bg-gradient-to-b from-[#436075] via-[#5E5B82] to-[#8A6E91] overflow-hidden relative font-sans">
      {/* 顶部标题 */}
      <div className="absolute top-12 left-6 text-white/60 pointer-events-none z-10 select-none">
        <h1 className="text-5xl font-light tracking-widest uppercase">IPS GARDEN</h1>
        <p className="text-sm mt-2 opacity-80 tracking-wide font-medium">
          种下一朵美好，释放十份热爱
        </p>
      </div>

      {/* 右上角计数器 */}
      <div className="absolute top-6 right-6 z-10 pointer-events-none select-none">
        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl w-40 h-40 flex flex-col items-center justify-center shadow-2xl">
            <div className="text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase mb-1 text-center leading-relaxed">
                IPS<br/>Collected
            </div>
            {/* UI 显示上限锁定为 9999 */}
            <div className={`text-white font-thin mt-1 transition-all duration-300 ${flowerCount > 999 ? 'text-5xl' : 'text-6xl'}`}>
                {flowerCount > 9999 ? 9999 : flowerCount}
            </div>
        </div>
      </div>

      {/* 左下角控制区 */}
      <div className="absolute bottom-12 left-6 z-20 select-none flex flex-col items-start gap-3">
        <div className="flex flex-col gap-2">
          {/* 手势种花按钮 */}
          <div className="flex items-center gap-2">
              <div className={`w-8 flex justify-center text-2xl transition-all duration-500 ${gestureEnabled ? 'opacity-100 scale-110 animate-bounce' : 'opacity-40 scale-100'}`}>
                  🤏
              </div>
              <div 
                className="bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-3 shadow-lg cursor-pointer transition-all hover:bg-white/20 active:scale-95 group"
                onClick={() => setGestureEnabled(!gestureEnabled)}
              >
                  <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${gestureEnabled ? 'bg-[#96B16D]' : 'bg-white/20'}`}>
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-300 ${gestureEnabled ? 'translate-x-6' : 'translate-x-1'}`}></div>
                  </div>
                  <span className="text-sm font-light tracking-wide text-white">
                    手势种花
                  </span>
              </div>
          </div>
          
          {/* 页脚 */}
          <div className="flex items-center gap-2">
              <div className="w-8 flex justify-center text-2xl opacity-80">
                  😊
              </div>
              <div className="text-[9px] font-medium tracking-[0.25em] text-white uppercase">
                Supported by ZZW
              </div>
          </div>
        </div>
      </div>

      {/* 右下角全屏按钮 */}
      <button 
        onClick={toggleFullscreen}
        className="fixed bottom-12 right-6 z-50 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-6 py-3 flex items-center gap-3 shadow-lg cursor-pointer transition-all hover:bg-white/20 active:scale-95 group"
      >
        <div className="relative w-5 h-5">
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white/80"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white/80"></div>
        </div>
        <span className="text-sm font-medium tracking-wide text-white">
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </span>
      </button>

      <GardenCanvas onUpdateCount={handleUpdateCount} enableGestures={gestureEnabled} />
    </div>
  );
};

export default App;