export interface Frame {
  id: string;
  imageData: ImageData;
  delay: number;
  width: number;
  height: number;
  disposalMethod: number;
}

export interface Caption {
  id: string;
  text: string;
  frameRange: [number, number];
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  align: 'left' | 'center' | 'right';
}

export interface CropConfig {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExportConfig {
  colors: number;
  quality: number;
  fps: number;
  dither: boolean;
  repeat: number;
  width: number;
  height: number;
}

export interface BeatPoint {
  time: number;
  strength: number;
  frequency: 'low' | 'mid' | 'high';
}

export interface AudioAnalysis {
  duration: number;
  sampleRate: number;
  waveformData: Float32Array;
  waveformPeaks: number[];
  beats: BeatPoint[];
  bpm: number;
  frequencyBands: {
    low: number[];
    mid: number[];
    high: number[];
  };
}

export interface AudioTrack {
  id: string;
  name: string;
  url: string;
  file: File;
  analysis: AudioAnalysis | null;
  volume: number;
  muted: boolean;
}

export interface BeatSyncConfig {
  enabled: boolean;
  sensitivity: number;
  beatType: 'low' | 'mid' | 'high' | 'all';
  effectOnBeat: 'none' | 'flash' | 'shake' | 'zoom' | 'custom';
  autoAdjustDelay: boolean;
  markKeyframes: boolean;
}

export interface EditorState {
  frames: Frame[];
  selectedFrameIndex: number;
  captions: Caption[];
  crop: CropConfig;
  exportConfig: ExportConfig;
  isPlaying: boolean;
  playbackSpeed: number;
  currentFrameIndex: number;
  canvasWidth: number;
  canvasHeight: number;
  audioTrack: AudioTrack | null;
  audioCurrentTime: number;
  beatSyncConfig: BeatSyncConfig;
  audioIsPlaying: boolean;
}
