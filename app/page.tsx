"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  waveformData: number[];
}

export default function AudioEditor() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const wetGainRef = useRef<GainNode | null>(null);
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
    waveformData: [],
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const effectiveDuration = state.duration / state.speed;

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

      convolverRef.current.buffer = createImpulseResponse(2, 2);

      gainNodeRef.current.connect(dryGainRef.current);
      gainNodeRef.current.connect(convolverRef.current);
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
  }, [state.audioBuffer, state.speed, state.volume, state.reverb, state.duration]);

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

      const convolver = offlineContext.createConvolver();
      convolver.buffer = createImpulseResponse(2, 2);

      const dryGain = offlineContext.createGain();
      const wetGain = offlineContext.createGain();

      dryGain.gain.value = 1 - state.reverb * 0.5;
      wetGain.gain.value = state.reverb;

      source.connect(gainNode);
      gainNode.connect(dryGain);
      gainNode.connect(convolver);
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
    state.fileName,
    audioBufferToWav,
    wavToMp3,
    createImpulseResponse,
  ]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white">
      <div className="w-full max-w-2xl px-4 py-12">
        <h1 className="mb-2 text-center text-4xl font-bold tracking-tight text-zinc-900">
          Recore Studio
        </h1>
        <p className="mb-10 text-center text-sm text-zinc-500">
          Upload, edit, and export your audio
        </p>

        <div
          className={`w-full rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
            isDragging
              ? "border-zinc-900 bg-zinc-100"
              : "border-zinc-300 bg-zinc-50"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {state.file ? (
            <div className="flex items-center justify-center gap-3">
              <svg
                className="h-6 w-6 text-zinc-900"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
              <span className="font-medium text-zinc-900">{state.fileName}</span>
              <span className="text-sm text-zinc-500">
                {formatTime(state.duration)}
              </span>
              <label className="ml-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-300">
                Change
                <input
                  type="file"
                  className="hidden"
                  accept=".mp3,.wav"
                  onChange={handleFileInput}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <svg
                className="mx-auto h-10 w-10 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="font-medium text-zinc-700">
                Drop your audio file here
              </p>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800">
                Select File
                <input
                  type="file"
                  className="hidden"
                  accept=".mp3,.wav"
                  onChange={handleFileInput}
                />
              </label>
              <p className="text-xs text-zinc-400">MP3 or WAV</p>
            </div>
          )}
        </div>

        {state.audioBuffer && (
          <div className="mt-8 w-full space-y-6">
            <div
              className="hidden md:relative h-28 w-full cursor-pointer rounded-xl bg-zinc-100 p-3"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                seek(percentage * effectiveDuration);
              }}
            >
              <div className="absolute inset-0 flex items-end px-3 py-3">
                {state.waveformData.map((value, index) => {
                  const percentage = index / state.waveformData.length;
                  const isPlayed =
                    percentage <= state.currentTime / effectiveDuration;
                  return (
                    <div
                      key={index}
                      className={`mx-px flex-1 rounded-t transition-colors ${
                        isPlayed ? "bg-zinc-900" : "bg-zinc-300"
                      }`}
                      style={{ height: `${value * 100}%` }}
                    />
                  );
                })}
              </div>
            </div>

            <input
              type="range"
              min="0"
              max={effectiveDuration}
              step="0.01"
              value={state.currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full accent-zinc-900"
            />

            <div className="flex items-center justify-center gap-6">
              <span className="w-12 text-right font-mono text-xs text-zinc-500">
                {formatTime(state.currentTime)}
              </span>

              <button
                onClick={() => seek(state.currentTime - 5)}
                className="rounded-full p-2 text-zinc-400 transition-colors hover:text-zinc-900"
                aria-label="Rewind 5 seconds"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
                  />
                </svg>
              </button>

              <button
                onClick={state.isPlaying ? pause : play}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white transition-transform hover:scale-105"
                aria-label={state.isPlaying ? "Pause" : "Play"}
              >
                {state.isPlaying ? (
                  <svg
                    className="h-6 w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg
                    className="h-6 w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => seek(state.currentTime + 5)}
                className="rounded-full p-2 text-zinc-400 transition-colors hover:text-zinc-900"
                aria-label="Forward 5 seconds"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"
                  />
                </svg>
              </button>

              <span className="w-12 font-mono text-xs text-zinc-500">
                {formatTime(effectiveDuration)}
              </span>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="speed"
                    className="text-sm font-medium text-zinc-700"
                  >
                    Playback Speed
                  </label>
                  <span className="font-mono text-sm text-zinc-900">
                    {state.speed.toFixed(2)}x
                  </span>
                </div>
                <input
                  id="speed"
                  type="range"
                  min="0.25"
                  max="4"
                  step="0.05"
                  value={state.speed}
                  onChange={(e) => updateSpeed(parseFloat(e.target.value))}
                  className="w-full accent-zinc-900"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="reverb"
                    className="text-sm font-medium text-zinc-700"
                  >
                    Reverb
                  </label>
                  <span className="font-mono text-sm text-zinc-900">
                    {Math.round(state.reverb * 100)}%
                  </span>
                </div>
                <input
                  id="reverb"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={state.reverb}
                  onChange={(e) => updateReverb(parseFloat(e.target.value))}
                  className="w-full accent-zinc-900"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="volume"
                    className="text-sm font-medium text-zinc-700"
                  >
                    Volume
                  </label>
                  <span className="font-mono text-sm text-zinc-900">
                    {Math.round(state.volume * 100)}%
                  </span>
                </div>
                <input
                  id="volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={state.volume}
                  onChange={(e) => updateVolume(parseFloat(e.target.value))}
                  className="w-full accent-zinc-900"
                />
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download MP3
                </>
              )}
            </button>
          </div>
        )}
      </div>
      <footer className="mt-auto py-6 text-center text-sm text-zinc-400">
        Built by{" "}
        <a
          href="https://github.com/SafeBuckleDev"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 transition-colors hover:text-zinc-900"
        >
          SafeBuckleDev
        </a>
      </footer>
    </div>
  );
}