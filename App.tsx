
import React, { useState, useEffect, useCallback } from 'react';
import { GardenCanvas } from './components/GardenCanvas';

const App: React.FC = () => {
  const [flowerCount, setFlowerCount] = useState(0);
  const [gestureEnabled, setGestureEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  // 使用 useCallback 确保函数引用稳定，防止子组件 Effect 误触发
  const handleUpdateCount = useCallback((count: number) => {
    setFlowerCount(count);
  }, []);

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

  const handleClear = () => {
    setResetSignal(prev => prev + 1);
    setFlowerCount(0);
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
      {/* 背景大水印 - 调整为正常、平面的展示方式，字号调整为约 35vw 以匹配红框大小 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
        <span className="text-white/[0.05] text-[35vw] font-black tracking-tighter leading-none uppercase">
          IPS
        </span>
      </div>

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

      {/* 右下角控制按钮组 */}
      <div className="fixed bottom-12 right-6 z-50 flex items-center gap-4">
        {/* 全屏按钮 */}
        <button 
          onClick={toggleFullscreen}
          className="w-14 h-14 bg-white/10 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-all hover:bg-white/20 active:scale-90 group"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          <div className="relative w-5 h-5">
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white/80"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white/80"></div>
          </div>
        </button>

        {/* 清屏按钮 */}
        <button 
          onClick={handleClear}
          className="w-14 h-14 bg-white/10 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-all hover:bg-white/20 active:scale-90 group"
          title="Clear All"
        >
          <div className="w-5 h-5 border-2 border-white/80 rounded-full flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-white/80 rounded-full"></div>
          </div>
        </button>
      </div>

      <div className="relative z-10 w-full h-full">
        <GardenCanvas 
          onUpdateCount={handleUpdateCount} 
          enableGestures={gestureEnabled} 
          resetSignal={resetSignal}
        />
      </div>
    </div>
  );
};

export default App;
