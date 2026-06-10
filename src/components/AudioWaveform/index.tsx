import { useEffect, useRef, useCallback, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Trash2, SkipBack } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';

interface AudioWaveformProps {
  className?: string;
}

export default function AudioWaveform({ className }: AudioWaveformProps) {
  const {
    audioTrack,
    audioCurrentTime,
    audioIsPlaying,
    setAudioCurrentTime,
    setAudioIsPlaying,
    setAudioVolume,
    setAudioMuted,
    removeAudioTrack,
  } = useEditorStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!audioTrack) return;

    const audio = new Audio(audioTrack.url);
    audio.volume = audioTrack.muted ? 0 : audioTrack.volume;
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setAudioCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setAudioIsPlaying(false);
      setAudioCurrentTime(0);
      audio.currentTime = 0;
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioTrack, isDragging, setAudioCurrentTime, setAudioIsPlaying]);

  useEffect(() => {
    if (!audioRef.current || !audioTrack) return;
    audioRef.current.volume = audioTrack.muted ? 0 : audioTrack.volume;
  }, [audioTrack?.volume, audioTrack?.muted, audioTrack]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (audioIsPlaying) {
      audioRef.current.play().catch(console.error);
    } else {
      audioRef.current.pause();
    }
  }, [audioIsPlaying]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !audioTrack || !audioTrack.analysis) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    const { waveformPeaks, beats, duration } = audioTrack.analysis;
    const barWidth = width / waveformPeaks.length;
    const maxBarHeight = height * 0.45;

    for (let i = 0; i < waveformPeaks.length; i++) {
      const barHeight = Math.max(2, waveformPeaks[i] * maxBarHeight);
      const x = i * barWidth;
      const progressRatio = (i / waveformPeaks.length) * duration;
      const isPast = progressRatio <= audioCurrentTime;

      const gradient = ctx.createLinearGradient(x, centerY - barHeight, x, centerY + barHeight);
      if (isPast) {
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(0.5, '#a78bfa');
        gradient.addColorStop(1, '#8b5cf6');
      } else {
        gradient.addColorStop(0, '#475569');
        gradient.addColorStop(0.5, '#64748b');
        gradient.addColorStop(1, '#475569');
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(x, centerY - barHeight, Math.max(1, barWidth - 1), barHeight * 2);
    }

    beats.forEach((beat) => {
      const x = (beat.time / duration) * width;
      let color = '#22d3ee';
      if (beat.frequency === 'low') color = '#f472b6';
      if (beat.frequency === 'high') color = '#fbbf24';

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.3 + beat.strength * 0.7;
      ctx.fillRect(x - 1, 0, 2, height);
      ctx.globalAlpha = 1;
    });

    const playheadX = (audioCurrentTime / duration) * width;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(playheadX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [audioTrack, audioCurrentTime]);

  useEffect(() => {
    drawWaveform();
    const handleResize = () => drawWaveform();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawWaveform]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioTrack || !audioTrack.analysis) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    const newTime = ratio * audioTrack.analysis.duration;
    setAudioCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    handleCanvasClick(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    handleCanvasClick(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const togglePlay = () => {
    if (!audioTrack) return;
    setAudioIsPlaying(!audioIsPlaying);
  };

  const handleRestart = () => {
    setAudioCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!audioTrack) {
    return (
      <div className={cn('bg-slate-900 border-t border-slate-700 px-4 py-3 flex items-center justify-center', className)}>
        <p className="text-sm text-slate-500">暂无音频，点击导入按钮添加音频文件</p>
      </div>
    );
  }

  const analysis = audioTrack.analysis;

  return (
    <div
      ref={containerRef}
      className={cn('bg-slate-900 border-t border-slate-700 px-4 py-3', className)}
    >
      <div className="flex items-center gap-4 mb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={handleRestart}
            className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-colors"
            title="重新开始"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={togglePlay}
            className={cn(
              'p-2 rounded-lg text-white transition-all',
              audioIsPlaying
                ? 'bg-orange-500 hover:bg-orange-400'
                : 'bg-violet-600 hover:bg-violet-500'
            )}
          >
            {audioIsPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAudioMuted(!audioTrack.muted)}
            className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-colors"
          >
            {audioTrack.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={audioTrack.muted ? 0 : audioTrack.volume}
            onChange={(e) => {
              setAudioVolume(Number(e.target.value));
              if (audioTrack.muted) setAudioMuted(false);
            }}
            className="w-20 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-violet-500"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-200 truncate">{audioTrack.name}</span>
            {analysis && (
              <span className="text-xs text-slate-500 font-mono flex-shrink-0">
                {analysis.bpm} BPM · {analysis.beats.length} beats
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">
            {formatTime(audioCurrentTime)} / {analysis ? formatTime(analysis.duration) : '0:00'}
          </span>
          <button
            onClick={() => {
              if (confirm('确定移除音频？')) removeAudioTrack();
            }}
            className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-orange-400 rounded transition-colors"
            title="移除音频"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative h-16 bg-slate-950 rounded-lg overflow-hidden cursor-pointer">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        {!analysis && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span>正在分析音频...</span>
            </div>
          </div>
        )}
      </div>

      {analysis && (
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-pink-400/80" />
            <span>低频</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-cyan-400/80" />
            <span>中频</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-400/80" />
            <span>高频</span>
          </div>
        </div>
      )}
    </div>
  );
}
