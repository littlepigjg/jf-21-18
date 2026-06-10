import { useState } from 'react';
import {
  Type,
  Crop,
  Palette,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Clock,
  Music,
  Zap,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import type { Caption } from '@/types';
import { applyBeatSyncToFrames } from '@/utils/audioAnalyzer';
import { cn } from '@/lib/utils';

interface PanelSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function PanelSection({ title, icon, children, defaultOpen = true }: PanelSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-slate-200">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

function CaptionEditor({ caption }: { caption: Caption }) {
  const { updateCaption, deleteCaption, frames } = useEditorStore();
  const maxFrame = Math.max(0, frames.length - 1);

  return (
    <div className="bg-slate-800/50 rounded-lg p-3 space-y-2 border border-slate-700">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">字幕内容</span>
        <button
          onClick={() => deleteCaption(caption.id)}
          className="p-1 hover:bg-slate-700 text-slate-400 hover:text-orange-400 rounded transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <input
        type="text"
        value={caption.text}
        onChange={(e) => updateCaption(caption.id, { text: e.target.value })}
        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-600 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
        placeholder="输入字幕内容"
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-400 block mb-1">字体大小</label>
          <input
            type="number"
            value={caption.fontSize}
            onChange={(e) => updateCaption(caption.id, { fontSize: Number(e.target.value) })}
            className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-violet-500"
            min={8}
            max={200}
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">对齐</label>
          <select
            value={caption.align}
            onChange={(e) =>
              updateCaption(caption.id, { align: e.target.value as 'left' | 'center' | 'right' })
            }
            className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-violet-500"
          >
            <option value="left">左对齐</option>
            <option value="center">居中</option>
            <option value="right">右对齐</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-400 block mb-1">X 位置</label>
          <input
            type="number"
            value={caption.x}
            onChange={(e) => updateCaption(caption.id, { x: Number(e.target.value) })}
            className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Y 位置</label>
          <input
            type="number"
            value={caption.y}
            onChange={(e) => updateCaption(caption.id, { y: Number(e.target.value) })}
            className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-400 block mb-1">文字颜色</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={caption.color}
              onChange={(e) => updateCaption(caption.id, { color: e.target.value })}
              className="w-8 h-8 rounded border border-slate-600 cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={caption.color}
              onChange={(e) => updateCaption(caption.id, { color: e.target.value })}
              className="flex-1 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">描边颜色</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={caption.strokeColor}
              onChange={(e) => updateCaption(caption.id, { strokeColor: e.target.value })}
              className="w-8 h-8 rounded border border-slate-600 cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={caption.strokeColor}
              onChange={(e) => updateCaption(caption.id, { strokeColor: e.target.value })}
              className="flex-1 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-400 block mb-1">
          帧范围: {caption.frameRange[0] + 1} - {caption.frameRange[1] + 1}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={maxFrame}
            value={caption.frameRange[0]}
            onChange={(e) =>
              updateCaption(caption.id, {
                frameRange: [Number(e.target.value), Math.max(Number(e.target.value), caption.frameRange[1])],
              })
            }
            className="flex-1 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-violet-500"
          />
          <input
            type="range"
            min={0}
            max={maxFrame}
            value={caption.frameRange[1]}
            onChange={(e) =>
              updateCaption(caption.id, {
                frameRange: [Math.min(caption.frameRange[0], Number(e.target.value)), Number(e.target.value)],
              })
            }
            className="flex-1 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
          />
        </div>
      </div>
    </div>
  );
}

export default function PropertyPanel() {
  const {
    captions,
    addCaption,
    crop,
    setCrop,
    exportConfig,
    setExportConfig,
    frames,
    canvasWidth,
    canvasHeight,
    setAllFrameDelays,
    audioTrack,
    beatSyncConfig,
    setBeatSyncConfig,
    setFrameDelay,
  } = useEditorStore();

  const [globalDelay, setGlobalDelay] = useState(100);
  const [applyingSync, setApplyingSync] = useState(false);
  const [lastKeyframeCount, setLastKeyframeCount] = useState(0);

  return (
    <div className="w-80 bg-slate-900/50 border-l border-slate-700 flex flex-col flex-shrink-0 overflow-y-auto">
      <div className="p-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-slate-200">属性设置</h3>
      </div>

      <PanelSection
        title="全局帧时长"
        icon={<Clock className="w-4 h-4 text-cyan-400" />}
        defaultOpen={true}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-400">统一设置时长</label>
            <span className="text-xs text-slate-300 font-mono">{globalDelay}ms</span>
          </div>
          <input
            type="range"
            min="10"
            max="5000"
            step="10"
            value={globalDelay}
            onChange={(e) => setGlobalDelay(Number(e.target.value))}
            className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-violet-500"
          />
          <button
            onClick={() => setAllFrameDelays(globalDelay)}
            disabled={frames.length === 0}
            className="w-full py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
          >
            应用到所有帧
          </button>
        </div>
      </PanelSection>

      <PanelSection
        title="音画同步"
        icon={<Music className="w-4 h-4 text-pink-400" />}
        defaultOpen={true}
      >
        {!audioTrack ? (
          <div className="text-center py-4">
            <Music className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">请先导入音频文件</p>
          </div>
        ) : !audioTrack.analysis ? (
          <div className="text-center py-4">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">正在分析音频...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">检测到 BPM</span>
                <span className="text-violet-300 font-mono font-bold">{audioTrack.analysis.bpm}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">节拍点数</span>
                <span className="text-cyan-300 font-mono">{audioTrack.analysis.beats.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">音频时长</span>
                <span className="text-slate-300 font-mono">
                  {Math.floor(audioTrack.analysis.duration / 60)}:
                  {Math.floor(audioTrack.analysis.duration % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={beatSyncConfig.enabled}
                onChange={(e) => setBeatSyncConfig({ enabled: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 text-pink-600 focus:ring-pink-500 bg-slate-900"
              />
              <span className="text-sm text-slate-300">启用音画同步</span>
            </label>

            <div className={cn('space-y-3', !beatSyncConfig.enabled && 'opacity-50 pointer-events-none')}>
              <div>
                <label className="text-xs text-slate-400 block mb-1">节拍类型</label>
                <select
                  value={beatSyncConfig.beatType}
                  onChange={(e) =>
                    setBeatSyncConfig({ beatType: e.target.value as 'low' | 'mid' | 'high' | 'all' })
                  }
                  className="w-full px-2 py-1.5 bg-slate-900 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-pink-500"
                >
                  <option value="low">低频 (贝斯/鼓点)</option>
                  <option value="mid">中频</option>
                  <option value="high">高频 (镲片)</option>
                  <option value="all">全部频率</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-400">检测灵敏度</label>
                  <span className="text-xs text-slate-300 font-mono">
                    {Math.round(beatSyncConfig.sensitivity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={beatSyncConfig.sensitivity}
                  onChange={(e) => setBeatSyncConfig({ sensitivity: Number(e.target.value) })}
                  className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-pink-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">节拍特效</label>
                <select
                  value={beatSyncConfig.effectOnBeat}
                  onChange={(e) =>
                    setBeatSyncConfig({
                      effectOnBeat: e.target.value as 'none' | 'flash' | 'shake' | 'zoom' | 'custom',
                    })
                  }
                  className="w-full px-2 py-1.5 bg-slate-900 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-pink-500"
                >
                  <option value="none">无特效</option>
                  <option value="flash">闪光</option>
                  <option value="shake">震动</option>
                  <option value="zoom">缩放</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={beatSyncConfig.markKeyframes}
                  onChange={(e) => setBeatSyncConfig({ markKeyframes: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-600 text-pink-600 focus:ring-pink-500 bg-slate-900"
                />
                <span className="text-sm text-slate-300">节拍点标记关键帧</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={beatSyncConfig.autoAdjustDelay}
                  onChange={(e) => setBeatSyncConfig({ autoAdjustDelay: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-600 text-pink-600 focus:ring-pink-500 bg-slate-900"
                />
                <span className="text-sm text-slate-300">自动调整帧时长</span>
              </label>

              <button
                onClick={async () => {
                  if (!audioTrack.analysis || frames.length === 0) return;
                  setApplyingSync(true);
                  try {
                    const { delays, keyframes } = applyBeatSyncToFrames(
                      audioTrack.analysis.beats,
                      frames,
                      exportConfig.fps,
                      beatSyncConfig.beatType,
                      beatSyncConfig.autoAdjustDelay
                    );

                    if (beatSyncConfig.autoAdjustDelay) {
                      delays.forEach((delay, i) => {
                        setFrameDelay(i, delay);
                      });
                    }

                    setLastKeyframeCount(keyframes.length);
                  } finally {
                    setApplyingSync(false);
                  }
                }}
                disabled={frames.length === 0 || applyingSync}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Zap className="w-4 h-4" />
                {applyingSync ? '应用中...' : '应用节拍同步到帧'}
              </button>

              {lastKeyframeCount > 0 && (
                <div className="text-center text-xs text-emerald-400">
                  已标记 {lastKeyframeCount} 个节拍关键帧
                </div>
              )}
            </div>
          </div>
        )}
      </PanelSection>

      <PanelSection
        title="字幕"
        icon={<Type className="w-4 h-4 text-violet-400" />}
        defaultOpen={true}
      >
        <button
          onClick={() => addCaption()}
          disabled={frames.length === 0}
          className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 rounded-lg text-sm font-medium transition-colors mb-2"
        >
          <Plus className="w-4 h-4" />
          添加字幕
        </button>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {captions.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">暂无字幕</p>
          ) : (
            captions.map((caption) => (
              <CaptionEditor key={caption.id} caption={caption} />
            ))
          )}
        </div>
      </PanelSection>

      <PanelSection
        title="裁切"
        icon={<Crop className="w-4 h-4 text-orange-400" />}
        defaultOpen={false}
      >
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={crop.enabled}
              onChange={(e) => setCrop({ enabled: e.target.checked })}
              className="w-4 h-4 rounded border-slate-600 text-violet-600 focus:ring-violet-500 bg-slate-900"
            />
            <span className="text-sm text-slate-300">启用裁切</span>
          </label>

          <div className={cn('space-y-2', !crop.enabled && 'opacity-50 pointer-events-none')}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">X 起点</label>
                <input
                  type="number"
                  value={crop.x}
                  onChange={(e) => setCrop({ x: Number(e.target.value) })}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-violet-500"
                  min={0}
                  max={canvasWidth}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Y 起点</label>
                <input
                  type="number"
                  value={crop.y}
                  onChange={(e) => setCrop({ y: Number(e.target.value) })}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-violet-500"
                  min={0}
                  max={canvasHeight}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">宽度</label>
                <input
                  type="number"
                  value={crop.width}
                  onChange={(e) => setCrop({ width: Number(e.target.value) })}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-violet-500"
                  min={1}
                  max={canvasWidth}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">高度</label>
                <input
                  type="number"
                  value={crop.height}
                  onChange={(e) => setCrop({ height: Number(e.target.value) })}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-violet-500"
                  min={1}
                  max={canvasHeight}
                />
              </div>
            </div>
            <button
              onClick={() =>
                setCrop({
                  x: 0,
                  y: 0,
                  width: canvasWidth,
                  height: canvasHeight,
                })
              }
              className="w-full py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded transition-colors"
            >
              重置为画布尺寸
            </button>
          </div>
        </div>
      </PanelSection>

      <PanelSection
        title="调色板优化"
        icon={<Palette className="w-4 h-4 text-emerald-400" />}
        defaultOpen={true}
      >
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-400">颜色数量</label>
              <span className="text-xs text-slate-300 font-mono">{exportConfig.colors}</span>
            </div>
            <input
              type="range"
              min={2}
              max={256}
              step={1}
              value={exportConfig.colors}
              onChange={(e) => setExportConfig({ colors: Number(e.target.value) })}
              className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
            />
            <p className="text-xs text-slate-500 mt-1">颜色越少文件越小</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-400">质量</label>
              <span className="text-xs text-slate-300 font-mono">{exportConfig.quality}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={exportConfig.quality}
              onChange={(e) => setExportConfig({ quality: Number(e.target.value) })}
              className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exportConfig.dither}
              onChange={(e) => setExportConfig({ dither: e.target.checked })}
              className="w-4 h-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-slate-900"
            />
            <span className="text-sm text-slate-300">启用抖动 (提升画质)</span>
          </label>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-400">输出帧率 (FPS)</label>
              <span className="text-xs text-slate-300 font-mono">{exportConfig.fps}</span>
            </div>
            <input
              type="range"
              min={1}
              max={60}
              step={1}
              value={exportConfig.fps}
              onChange={(e) => setExportConfig({ fps: Number(e.target.value) })}
              className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400 block mb-1">输出宽度</label>
              <input
                type="number"
                value={exportConfig.width || canvasWidth}
                onChange={(e) => setExportConfig({ width: Number(e.target.value) })}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-violet-500"
                min={1}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">输出高度</label>
              <input
                type="number"
                value={exportConfig.height || canvasHeight}
                onChange={(e) => setExportConfig({ height: Number(e.target.value) })}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-violet-500"
                min={1}
              />
            </div>
          </div>
        </div>
      </PanelSection>
    </div>
  );
}
