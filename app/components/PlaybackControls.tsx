import { formatTime } from "@/lib/formatTime";

interface PlaybackControlsProps {
  currentTime: number;
  duration: number;
  speed: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
}

export default function PlaybackControls({
  currentTime,
  duration,
  speed,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
}: PlaybackControlsProps) {
  const effectiveDuration = duration / speed;

  return (
    <div className="flex items-center justify-center gap-6">
      <span className="w-12 text-right font-mono text-xs text-zinc-500">
        {formatTime(currentTime)}
      </span>

      <button
        onClick={() => onSeek(currentTime - 5)}
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
        onClick={isPlaying ? onPause : onPlay}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white transition-transform hover:scale-105"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <button
        onClick={() => onSeek(currentTime + 5)}
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
  );
}
