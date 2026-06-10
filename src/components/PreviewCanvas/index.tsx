import { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { processFrame } from '@/utils/frameProcessor';
import type { BeatPoint } from '@/types';

export default function PreviewCanvas() {
  const {
    frames,
    currentFrameIndex,
    setCurrentFrameIndex,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    captions,
    crop,
    canvasWidth,
    canvasHeight,
    selectedFrameIndex,
    setSelectedFrameIndex,
    audioTrack,
    audioCurrentTime,
    audioIsPlaying,
    setAudioIsPlaying,
    beatSyncConfig,
  } = useEditorStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);
  const [zoom, setZoom] = useState(1);
  const [activeBeat, setActiveBeat] = useState<BeatPoint | null>(null);
  const beatFlashRef = useRef<number>(0);
  const lastBeatIndexRef = useRef<number>(-1);

  const getFrameIndexAtTime = useCallback((time: number): number => {
    if (frames.length === 0) return 0;
    let accumulated = 0;
    for (let i = 0; i < frames.length; i++) {
      accumulated += frames[i].delay;
      if (accumulated >= time * 1000) {
        return i;
      }
    }
    return frames.length - 1;
  }, [frames]);

  const findBeatAtTime = useCallback((time: number): BeatPoint | null => {
    if (!audioTrack?.analysis?.beats) return null;
    const { beats } = audioTrack.analysis;
    const threshold = 0.05;
    for (let i = 0; i < beats.length; i++) {
      if (Math.abs(beats[i].time - time) < threshold) {
        if (beatSyncConfig.beatType === 'all' || beats[i].frequency === beatSyncConfig.beatType) {
          if (i !== lastBeatIndexRef.current) {
            lastBeatIndexRef.current = i;
            return beats[i];
          }
        }
      }
    }
    return null;
  }, [audioTrack, beatSyncConfig.beatType]);

  useEffect(() => {
    if (audioIsPlaying && audioTrack?.analysis) {
      const beat = findBeatAtTime(audioCurrentTime);
      if (beat) {
        setActiveBeat(beat);
        beatFlashRef.current = 1;
        if (beatSyncConfig.markKeyframes) {
          const frameIdx = getFrameIndexAtTime(audioCurrentTime);
          if (frameIdx !== currentFrameIndex) {
            setCurrentFrameIndex(frameIdx);
            setSelectedFrameIndex(frameIdx);
          }
        }
      }
    }
  }, [audioCurrentTime, audioIsPlaying, audioTrack, findBeatAtTime, beatSyncConfig.markKeyframes, getFrameIndexAtTime, currentFrameIndex, setCurrentFrameIndex, setSelectedFrameIndex]);

  useEffect(() => {
    if (beatFlashRef.current > 0) {
      const timer = setTimeout(() => {
        beatFlashRef.current = Math.max(0, beatFlashRef.current - 0.1);
        if (beatFlashRef.current <= 0) {
          setActiveBeat(null);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeBeat]);

  useEffect(() => {
    if (audioIsPlaying && audioTrack?.analysis && beatSyncConfig.enabled) {
      return;
    }

    if (!isPlaying || frames.length === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastFrameTimeRef.current) {
        lastFrameTimeRef.current = timestamp;
      }

      const delta = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;
      accumulatedTimeRef.current += delta * playbackSpeed;

      const currentFrame = frames[currentFrameIndex];
      if (currentFrame && accumulatedTimeRef.current >= currentFrame.delay) {
        accumulatedTimeRef.current = 0;
        const nextIndex = currentFrameIndex >= frames.length - 1 ? 0 : currentFrameIndex + 1;
        setCurrentFrameIndex(nextIndex);
        setSelectedFrameIndex(nextIndex);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    lastFrameTimeRef.current = 0;
    accumulatedTimeRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, frames, currentFrameIndex, playbackSpeed, setCurrentFrameIndex, setSelectedFrameIndex, audioIsPlaying, audioTrack, beatSyncConfig.enabled]);

  useEffect(() => {
    if (audioIsPlaying && audioTrack?.analysis && beatSyncConfig.enabled) {
      const frameIdx = getFrameIndexAtTime(audioCurrentTime);
      if (frameIdx !== currentFrameIndex) {
        setCurrentFrameIndex(frameIdx);
        setSelectedFrameIndex(frameIdx);
      }
    }
  }, [audioCurrentTime, audioIsPlaying, audioTrack, beatSyncConfig.enabled, getFrameIndexAtTime, currentFrameIndex, setCurrentFrameIndex, setSelectedFrameIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (frames.length === 0) return;

    const frame = frames[currentFrameIndex];
    if (!frame) return;

    const processedData = processFrame(frame, captions, currentFrameIndex, crop);
    canvas.width = processedData.width;
    canvas.height = processedData.height;
    ctx.putImageData(processedData, 0, 0);

    if (activeBeat && beatSyncConfig.effectOnBeat !== 'none') {
      const alpha = beatFlashRef.current * 0.5 * activeBeat.strength;
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';

      switch (beatSyncConfig.effectOnBeat) {
        case 'flash':
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          break;
        case 'shake':
          const shakeX = (Math.random() - 0.5) * 8 * activeBeat.strength;
          const shakeY = (Math.random() - 0.5) * 8 * activeBeat.strength;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.putImageData(processedData, shakeX, shakeY);
          break;
        case 'zoom':
          const scale = 1 + 0.1 * activeBeat.strength;
          const scaledWidth = canvas.width * scale;
          const scaledHeight = canvas.height * scale;
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.putImageData(processedData, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(
              tempCanvas,
              (canvas.width - scaledWidth) / 2,
              (canvas.height - scaledHeight) / 2,
              scaledWidth,
              scaledHeight
            );
          }
          break;
      }
      ctx.restore();
    }
  }, [currentFrameIndex, frames, captions, crop, activeBeat, beatSyncConfig.effectOnBeat]);

  const handleCanvasClick = () => {
    if (frames.length === 0 && !audioTrack) return;
    const newPlaying = !isPlaying;
    setIsPlaying(newPlaying);
    if (audioTrack) {
      setAudioIsPlaying(newPlaying);
    }
  };

  const displayWidth = canvasWidth * zoom;
  const displayHeight = canvasHeight * zoom;

  const fitToContainer = () => {
    const container = canvasRef.current?.parentElement;
    if (!container) return;
    const padding = 80;
    const availableWidth = container.clientWidth - padding;
    const availableHeight = container.clientHeight - padding;
    const zoomX = availableWidth / canvasWidth;
    const zoomY = availableHeight / canvasHeight;
    setZoom(Math.min(zoomX, zoomY, 2));
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 min-w-0">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
        <div className="text-sm text-slate-400 font-mono">
          {canvasWidth} × {canvasHeight} px
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-300 font-mono w-14 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(5, z + 0.1))}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={fitToContainer}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors ml-1"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-auto p-8">
        <div
          className="relative cursor-pointer"
          onClick={handleCanvasClick}
          style={{ width: displayWidth, height: displayHeight }}
        >
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                'linear-gradient(45deg, #2a2a3e 25%, transparent 25%), linear-gradient(-45deg, #2a2a3e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a3e 75%), linear-gradient(-45deg, transparent 75%, #2a2a3e 75%)',
              backgroundSize: '16px 16px',
              backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            }}
          />
          <canvas
            ref={canvasRef}
            className="relative z-10 shadow-2xl"
            style={{
              width: displayWidth,
              height: displayHeight,
              imageRendering: zoom >= 2 ? 'pixelated' : 'auto',
            }}
          />
          {frames.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-slate-900/80 rounded">
              <div className="text-6xl mb-4">🎬</div>
              <p className="text-slate-400 text-lg">点击上方导入按钮开始</p>
              <p className="text-slate-500 text-sm mt-2">支持 GIF / 视频 / 图片序列</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
