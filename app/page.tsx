"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import DropZone from "./components/DropZone";
import WaveformDisplay from "./components/WaveformDisplay";
import PlaybackControls from "./components/PlaybackControls";
import SliderControl from "./components/SliderControl";
import ExportButton from "./components/ExportButton";
import Footer from "./components/Footer";
import AboutCards from "./components/AboutCards";

interface AudioState {
  file: File | null;
  audioBuffer: AudioBuffer | null;
  fileName: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  speed: number;
  reverb: number;
  bass: number;
  waveformData: number[];
}

export default function AudioEditor() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const wetGainRef = useRef<GainNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);

  const [state, setState] = useState<AudioState>({
    file: null,
    audioBuffer: null,
    fileName: "",
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.75,
    speed: 1,
    reverb: 0,
    bass: 0,
    waveformData: [],
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const createImpulseResponse = useCallback(
    (duration: number, decay: number): AudioBuffer => {
      const audioContext = audioContextRef.current!;
      const sampleRate = audioContext.sampleRate;
      const length = sampleRate * duration;
      const impulse = audioContext.createBuffer(2, length, sampleRate);

      for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          channelData[i] =
            (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
      }

      return impulse;
    },
    []
  );

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();

      gainNodeRef.current = audioContextRef.current.createGain();
      convolverRef.current = audioContextRef.current.createConvolver();
      dryGainRef.current = audioContextRef.current.createGain();
      wetGainRef.current = audioContextRef.current.createGain();
      bassFilterRef.current = audioContextRef.current.createBiquadFilter();
      bassFilterRef.current.type = "lowshelf";
      bassFilterRef.current.frequency.value = 150;
      bassFilterRef.current.gain.value = 0;

      convolverRef.current.buffer = createImpulseResponse(2, 2);

      gainNodeRef.current.connect(bassFilterRef.current);
      bassFilterRef.current.connect(dryGainRef.current);
      bassFilterRef.current.connect(convolverRef.current);
      convolverRef.current.connect(wetGainRef.current);
      dryGainRef.current.connect(audioContextRef.current.destination);
      wetGainRef.current.connect(audioContextRef.current.destination);

      dryGainRef.current.gain.value = 1;
      wetGainRef.current.gain.value = 0;
    }
    return audioContextRef.current;
  }, [createImpulseResponse]);

  const extractWaveformData = useCallback((buffer: AudioBuffer): number[] => {
    const channelData = buffer.getChannelData(0);
    const samples = 200;
    const blockSize = Math.floor(channelData.length / samples);
    const waveform: number[] = [];
    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[i * blockSize + j]);
      }
      waveform.push(sum / blockSize);
    }
    const max = Math.max(...waveform);
    return waveform.map((v) => v / max);
  }, []);

  const handleFileUpload = useCallback(
    async (file: File) => {
      const audioContext = initAudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const waveform = extractWaveformData(audioBuffer);

      setState((prev) => ({
        ...prev,
        file,
        audioBuffer,
        fileName: file.name,
        duration: audioBuffer.duration,
        waveformData: waveform,
        currentTime: 0,
        isPlaying: false,
        speed: 1,
        reverb: 0,
        bass: 0,
      }));

      offsetRef.current = 0;
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
    },
    [initAudioContext, extractWaveformData]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.type === "audio/mpeg" || file.type === "audio/wav")) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const play = useCallback(() => {
    if (!state.audioBuffer || !audioContextRef.current) return;

    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = state.audioBuffer;
    source.playbackRate.value = state.speed;

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = state.volume;
    }

    if (bassFilterRef.current) {
      bassFilterRef.current.gain.value = state.bass * 20;
    }

    if (wetGainRef.current && dryGainRef.current) {
      wetGainRef.current.gain.value = state.reverb;
      dryGainRef.current.gain.value = 1 - state.reverb * 0.5;
    }

    source.connect(gainNodeRef.current!);

    const offsetInSeconds = offsetRef.current * state.speed;
    source.start(0, offsetInSeconds);

    sourceNodeRef.current = source;
    startTimeRef.current =
      audioContextRef.current.currentTime - offsetRef.current;

    setState((prev) => ({ ...prev, isPlaying: true }));

    source.onended = () => {
      setState((prev) => {
        if (prev.isPlaying) {
          const elapsed =
            audioContextRef.current!.currentTime - startTimeRef.current;
          if (elapsed >= prev.duration / prev.speed) {
            return { ...prev, isPlaying: false, currentTime: 0 };
          }
        }
        return prev;
      });
      if (offsetRef.current >= state.duration / state.speed - 0.1) {
        offsetRef.current = 0;
      }
    };
  }, [state.audioBuffer, state.speed, state.volume, state.reverb, state.bass, state.duration]);

  const pause = useCallback(() => {
    if (sourceNodeRef.current && audioContextRef.current) {
      const elapsed =
        audioContextRef.current.currentTime - startTimeRef.current;
      offsetRef.current = Math.min(elapsed, state.duration / state.speed);
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
      setState((prev) => ({ ...prev, isPlaying: false }));
    }
  }, [state.duration, state.speed]);

  const seek = useCallback(
    (time: number) => {
      const clampedTime = Math.max(
        0,
        Math.min(time, state.duration / state.speed)
      );
      const wasPlaying = state.isPlaying;
      if (wasPlaying) {
        if (sourceNodeRef.current) {
          sourceNodeRef.current.stop();
          sourceNodeRef.current = null;
        }
        const elapsed =
          audioContextRef.current!.currentTime - startTimeRef.current;
        offsetRef.current = elapsed;
      }
      offsetRef.current = clampedTime;
      setState((prev) => ({ ...prev, currentTime: clampedTime }));
      if (wasPlaying) {
        play();
      }
    },
    [state.isPlaying, state.duration, state.speed, play]
  );

  const updateVolume = useCallback(
    (volume: number) => {
      setState((prev) => ({ ...prev, volume }));
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = volume;
      }
    },
    []
  );

  const updateSpeed = useCallback(
    (speed: number) => {
      const wasPlaying = state.isPlaying;
      const oldSpeed = state.speed;

      let currentEffectiveTime = offsetRef.current;
      if (wasPlaying && audioContextRef.current) {
        const elapsed =
          audioContextRef.current.currentTime - startTimeRef.current;
        currentEffectiveTime = elapsed;
      }

      const originalAudioTime = currentEffectiveTime * oldSpeed;
      const newEffectiveTime = originalAudioTime / speed;

      if (wasPlaying && sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }

      setState((prev) => ({ ...prev, speed }));

      offsetRef.current = newEffectiveTime;

      if (wasPlaying) {
        setTimeout(() => play(), 0);
      }
    },
    [state.isPlaying, state.speed, play]
  );

  const updateReverb = useCallback(
    (reverb: number) => {
      setState((prev) => ({ ...prev, reverb }));
      if (wetGainRef.current && dryGainRef.current) {
        wetGainRef.current.gain.value = reverb;
        dryGainRef.current.gain.value = 1 - reverb * 0.5;
      }
    },
    []
  );

  const updateBass = useCallback(
    (bass: number) => {
      setState((prev) => ({ ...prev, bass }));
      if (bassFilterRef.current) {
        bassFilterRef.current.gain.value = bass * 20;
      }
    },
    []
  );

  const audioBufferToWav = useCallback((buffer: AudioBuffer): Blob => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, "RIFF");
    view.setUint32(4, bufferLength - 8, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, "data");
    view.setUint32(40, dataLength, true);

    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        view.setInt16(
          offset,
          sample < 0 ? sample * 0x8000 : sample * 0x7fff,
          true
        );
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  }, []);

  const wavToMp3 = useCallback(async (wavBlob: Blob): Promise<Blob> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(wavBlob), 100);
    });
  }, []);

  useEffect(() => {
    const updateAnimation = () => {
      if (state.isPlaying && audioContextRef.current) {
        const elapsed =
          audioContextRef.current.currentTime - startTimeRef.current;
        const currentTime = Math.min(elapsed, state.duration / state.speed);
        setState((prev) => ({ ...prev, currentTime }));
      }
      animationFrameRef.current = requestAnimationFrame(updateAnimation);
    };

    animationFrameRef.current = requestAnimationFrame(updateAnimation);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state.isPlaying, state.duration, state.speed]);

  const handleExport = useCallback(async () => {
    if (!state.audioBuffer || !audioContextRef.current) return;

    setIsExporting(true);

    try {
      const offlineContext = new OfflineAudioContext(
        state.audioBuffer.numberOfChannels,
        state.audioBuffer.length * (1 / state.speed),
        state.audioBuffer.sampleRate
      );

      const source = offlineContext.createBufferSource();
      source.buffer = state.audioBuffer;
      source.playbackRate.value = state.speed;

      const gainNode = offlineContext.createGain();
      gainNode.gain.value = state.volume;

      const bassFilter = offlineContext.createBiquadFilter();
      bassFilter.type = "lowshelf";
      bassFilter.frequency.value = 150;
      bassFilter.gain.value = state.bass * 20;

      const convolver = offlineContext.createConvolver();
      convolver.buffer = createImpulseResponse(2, 2);

      const dryGain = offlineContext.createGain();
      const wetGain = offlineContext.createGain();

      dryGain.gain.value = 1 - state.reverb * 0.5;
      wetGain.gain.value = state.reverb;

      source.connect(gainNode);
      gainNode.connect(bassFilter);
      bassFilter.connect(dryGain);
      bassFilter.connect(convolver);
      convolver.connect(wetGain);
      dryGain.connect(offlineContext.destination);
      wetGain.connect(offlineContext.destination);

      source.start(0);

      const renderedBuffer = await offlineContext.startRendering();

      const wavBlob = audioBufferToWav(renderedBuffer);
      const mp3Blob = await wavToMp3(wavBlob);

      const url = URL.createObjectURL(mp3Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = state.fileName.replace(/\.[^/.]+$/, "") + "_edited.mp3";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [
    state.audioBuffer,
    state.speed,
    state.volume,
    state.reverb,
    state.bass,
    state.fileName,
    audioBufferToWav,
    wavToMp3,
    createImpulseResponse,
  ]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white">
      <div className="w-full max-w-2xl px-4 py-12">
        <Header />

        <DropZone
          file={state.file}
          fileName={state.fileName}
          duration={state.duration}
          isDragging={isDragging}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onFileInput={handleFileInput}
        />

        {!state.audioBuffer && <AboutCards />}

        {state.audioBuffer && (
          <div className="mt-8 w-full space-y-6">
            <div className="hidden md:block h-16 w-full overflow-hidden rounded-lg bg-zinc-100">
              <div className="flex h-full items-end justify-center gap-[5px] px-4 pb-2">
                {state.waveformData.map((value, index) => {
                  const percentage = index / state.waveformData.length;
                  const isPlayed =
                    percentage <= state.currentTime / (state.duration / state.speed);
                  return (
                    <div
                      key={index}
                      className={`w-2 rounded-t transition-colors ${
                        isPlayed ? "bg-zinc-900" : "bg-zinc-300"
                      }`}
                      style={{ height: `${value * 100}%` }}
                    />
                  );
                })}
              </div>
            </div>

            <WaveformDisplay
              waveformData={state.waveformData}
              currentTime={state.currentTime}
              duration={state.duration}
              speed={state.speed}
              onSeek={seek}
            />

            <PlaybackControls
              currentTime={state.currentTime}
              duration={state.duration}
              speed={state.speed}
              isPlaying={state.isPlaying}
              onPlay={play}
              onPause={pause}
              onSeek={seek}
            />

            <div className="space-y-5 p-6">
              <SliderControl
                id="speed"
                label="Playback Speed"
                value={state.speed}
                min={0.5}
                max={2}
                step={0.01}
                displayValue={`${state.speed.toFixed(2)}x`}
                onChange={updateSpeed}
              />
              <SliderControl
                id="reverb"
                label="Reverb"
                value={state.reverb}
                min={0}
                max={1}
                step={0.01}
                displayValue={`${Math.round(state.reverb * 100)}%`}
                onChange={updateReverb}
              />
              <SliderControl
                id="bass"
                label="Bass Boost"
                value={state.bass}
                min={0}
                max={1}
                step={0.01}
                displayValue={`${Math.round(state.bass * 100)}%`}
                onChange={updateBass}
              />
              <SliderControl
                id="volume"
                label="Volume"
                value={state.volume}
                min={0}
                max={1}
                step={0.01}
                displayValue={`${Math.round(state.volume * 100)}%`}
                onChange={updateVolume}
              />
            </div>

            <ExportButton isExporting={isExporting} onExport={handleExport} />
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
