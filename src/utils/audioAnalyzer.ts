import type { AudioAnalysis, BeatPoint } from '@/types';

export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  audioContext.close();
  return audioBuffer;
}

export function extractWaveform(audioBuffer: AudioBuffer, samples: number = 500): {
  waveformData: Float32Array;
  waveformPeaks: number[];
} {
  const channelData = audioBuffer.getChannelData(0);
  const blockSize = Math.floor(channelData.length / samples);
  const waveformData = new Float32Array(samples);
  const waveformPeaks: number[] = [];

  for (let i = 0; i < samples; i++) {
    const start = i * blockSize;
    let sum = 0;
    let peak = 0;
    for (let j = 0; j < blockSize; j++) {
      const val = Math.abs(channelData[start + j] || 0);
      sum += val;
      if (val > peak) peak = val;
    }
    waveformData[i] = sum / blockSize;
    waveformPeaks.push(peak);
  }

  return { waveformData, waveformPeaks };
}

export function extractFrequencyBands(
  audioBuffer: AudioBuffer,
  bands: number = 100
): { low: number[]; mid: number[]; high: number[] } {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  const fftSize = 2048;
  const hopSize = fftSize / 2;
  const numFrames = Math.floor((channelData.length - fftSize) / hopSize);

  const lowBand: number[] = [];
  const midBand: number[] = [];
  const highBand: number[] = [];

  const nyquist = sampleRate / 2;
  const lowCutoff = 200 / nyquist;
  const midCutoff = 2000 / nyquist;

  for (let i = 0; i < Math.min(numFrames, bands); i++) {
    const start = i * hopSize;
    const segment = channelData.slice(start, start + fftSize);

    const windowed = applyHannWindow(segment);
    const magnitudes = computeFFTMagnitudes(windowed);

    const lowEnd = Math.floor(magnitudes.length * lowCutoff);
    const midEnd = Math.floor(magnitudes.length * midCutoff);

    let lowSum = 0;
    let midSum = 0;
    let highSum = 0;

    for (let j = 0; j < lowEnd; j++) lowSum += magnitudes[j];
    for (let j = lowEnd; j < midEnd; j++) midSum += magnitudes[j];
    for (let j = midEnd; j < magnitudes.length; j++) highSum += magnitudes[j];

    lowBand.push(lowSum / lowEnd);
    midBand.push(midSum / (midEnd - lowEnd));
    highBand.push(highSum / (magnitudes.length - midEnd));
  }

  return { low: lowBand, mid: midBand, high: highBand };
}

function applyHannWindow(data: Float32Array): Float32Array {
  const result = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (data.length - 1)));
    result[i] = data[i] * window;
  }
  return result;
}

function computeFFTMagnitudes(data: Float32Array): number[] {
  const n = data.length;
  const magnitudes: number[] = [];

  for (let k = 0; k < n / 2; k++) {
    let real = 0;
    let imag = 0;
    for (let t = 0; t < n; t++) {
      const angle = (-2 * Math.PI * k * t) / n;
      real += data[t] * Math.cos(angle);
      imag += data[t] * Math.sin(angle);
    }
    magnitudes.push(Math.sqrt(real * real + imag * imag) / n);
  }

  return magnitudes;
}

export function detectBeats(
  audioBuffer: AudioBuffer,
  sensitivity: number = 0.7
): BeatPoint[] {
  const beats: BeatPoint[] = [];
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  const windowSize = Math.floor(sampleRate * 0.05);
  const hopSize = Math.floor(sampleRate * 0.01);
  const energyHistory: number[] = [];
  const lowEnergyHistory: number[] = [];

  const nyquist = sampleRate / 2;
  const lowCutoff = 200 / nyquist;
  const fftSize = 1024;

  for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
    const segment = channelData.slice(i, i + windowSize);
    const energy = computeRMS(segment);
    energyHistory.push(energy);

    if (segment.length >= fftSize) {
      const fftSegment = segment.slice(0, fftSize);
      const windowed = applyHannWindow(fftSegment);
      const magnitudes = computeFFTMagnitudes(windowed);
      const lowEnd = Math.floor(magnitudes.length * lowCutoff);
      let lowSum = 0;
      for (let j = 0; j < lowEnd; j++) lowSum += magnitudes[j];
      lowEnergyHistory.push(lowSum / lowEnd);
    }
  }

  const historyWindow = 43;
  const threshold = sensitivity;

  for (let i = historyWindow; i < energyHistory.length; i++) {
    const recentEnergies = energyHistory.slice(i - historyWindow, i);
    const mean = recentEnergies.reduce((a, b) => a + b, 0) / recentEnergies.length;
    const std = Math.sqrt(
      recentEnergies.reduce((a, b) => a + (b - mean) ** 2, 0) / recentEnergies.length
    );

    const currentEnergy = energyHistory[i];
    const c = -0.0000015;
    const beatThreshold = mean * (1 + c) + std * threshold;

    if (currentEnergy > beatThreshold && currentEnergy > mean * 1.3) {
      const time = (i * hopSize) / sampleRate;
      const strength = Math.min(1, (currentEnergy - mean) / (std * 3 + 0.001));

      let freqType: 'low' | 'mid' | 'high' = 'mid';
      if (i < lowEnergyHistory.length) {
        const recentLow = lowEnergyHistory.slice(i - historyWindow, i);
        const lowMean = recentLow.reduce((a, b) => a + b, 0) / recentLow.length;
        if (lowEnergyHistory[i] > lowMean * 1.5) {
          freqType = 'low';
        } else if (energyHistory[i] > mean * 2) {
          freqType = 'high';
        }
      }

      if (beats.length === 0 || time - beats[beats.length - 1].time > 0.1) {
        beats.push({ time, strength, frequency: freqType });
      }
    }
  }

  return beats;
}

function computeRMS(data: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / data.length);
}

export function estimateBPM(beats: BeatPoint[]): number {
  if (beats.length < 4) return 120;

  const intervals: number[] = [];
  for (let i = 1; i < beats.length; i++) {
    const interval = beats[i].time - beats[i - 1].time;
    if (interval > 0.2 && interval < 2) {
      intervals.push(interval);
    }
  }

  if (intervals.length === 0) return 120;

  intervals.sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)];
  const bpm = 60 / median;

  if (bpm < 60) return bpm * 2;
  if (bpm > 200) return bpm / 2;
  return Math.round(bpm);
}

export async function analyzeAudio(
  file: File,
  onProgress?: (progress: number) => void
): Promise<AudioAnalysis> {
  onProgress?.(10);
  const audioBuffer = await decodeAudioFile(file);
  onProgress?.(40);

  const { waveformData, waveformPeaks } = extractWaveform(audioBuffer);
  onProgress?.(60);

  const frequencyBands = extractFrequencyBands(audioBuffer);
  onProgress?.(80);

  const beats = detectBeats(audioBuffer, 0.7);
  const bpm = estimateBPM(beats);
  onProgress?.(100);

  return {
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
    waveformData,
    waveformPeaks,
    beats,
    bpm,
    frequencyBands,
  };
}

export function getBeatsInTimeRange(
  beats: BeatPoint[],
  startTime: number,
  endTime: number,
  beatType: 'low' | 'mid' | 'high' | 'all' = 'all'
): BeatPoint[] {
  return beats.filter(
    (b) =>
      b.time >= startTime &&
      b.time <= endTime &&
      (beatType === 'all' || b.frequency === beatType)
  );
}

export function applyBeatSyncToFrames(
  beats: BeatPoint[],
  frames: { delay: number }[],
  fps: number = 15,
  beatType: 'low' | 'mid' | 'high' | 'all' = 'low',
  autoAdjustDelay: boolean = true
): { delays: number[]; keyframes: number[] } {
  const frameDuration = 1000 / fps;
  const delays: number[] = [];
  const keyframes: number[] = [];

  const filteredBeats = beatType === 'all'
    ? beats
    : beats.filter((b) => b.frequency === beatType);

  let beatIndex = 0;
  let accumulatedTime = 0;

  for (let i = 0; i < frames.length; i++) {
    const frameStartTime = accumulatedTime / 1000;
    const frameEndTime = (accumulatedTime + frames[i].delay) / 1000;

    const beatsInFrame = filteredBeats.filter(
      (b) => b.time >= frameStartTime && b.time < frameEndTime
    );

    if (beatsInFrame.length > 0) {
      keyframes.push(i);

      if (autoAdjustDelay) {
        const avgStrength = beatsInFrame.reduce((s, b) => s + b.strength, 0) / beatsInFrame.length;
        const adjustedDelay = Math.max(20, Math.floor(frameDuration * (1 - avgStrength * 0.4)));
        delays.push(adjustedDelay);
        accumulatedTime += adjustedDelay;
        beatIndex += beatsInFrame.length;
        continue;
      }
    }

    delays.push(frames[i].delay);
    accumulatedTime += frames[i].delay;
  }

  return { delays, keyframes };
}
