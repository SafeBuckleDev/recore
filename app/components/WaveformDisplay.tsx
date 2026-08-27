interface WaveformDisplayProps {
  waveformData: number[];
  currentTime: number;
  duration: number;
  speed: number;
  onSeek: (time: number) => void;
}

export default function WaveformDisplay({
  waveformData,
  currentTime,
  duration,
  speed,
  onSeek,
}: WaveformDisplayProps) {
  const effectiveDuration = duration / speed;

  return (
    <>
      <div
        className="hidden md:relative h-28 w-full cursor-pointer rounded-xl bg-zinc-100 p-3"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const percentage = x / rect.width;
          onSeek(percentage * effectiveDuration);
        }}
      >
        <div className="absolute inset-0 flex items-end px-3 py-3">
          {waveformData.map((value, index) => {
            const percentage = index / waveformData.length;
            const isPlayed = percentage <= currentTime / effectiveDuration;
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
        value={currentTime}
        onChange={(e) => onSeek(parseFloat(e.target.value))}
        className="w-full accent-zinc-900"
      />
    </>
  );
}
