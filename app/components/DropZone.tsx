import { formatTime } from "@/lib/formatTime";

interface DropZoneProps {
  file: File | null;
  fileName: string;
  duration: number;
  isDragging: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function DropZone({
  file,
  fileName,
  duration,
  isDragging,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileInput,
}: DropZoneProps) {
  return (
    <div
      className={`w-full rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
        isDragging
          ? "border-zinc-900 bg-zinc-100"
          : "border-zinc-300 bg-zinc-50"
      }`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {file ? (
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
          <span className="font-medium text-zinc-900">{fileName}</span>
          <span className="text-sm text-zinc-500">{formatTime(duration)}</span>
          <label className="ml-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-300">
            Change
            <input
              type="file"
              className="hidden"
              accept=".mp3,.wav"
              onChange={onFileInput}
            />
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="hidden md:block md:relative h-16 w-full overflow-hidden rounded-lg bg-zinc-100">
            <div className="absolute inset-0 flex items-end justify-center gap-[3px] px-4 pb-2">
              {[
                35, 50, 40, 65, 55, 70, 45, 60, 35, 50, 70, 55, 40, 65, 50,
                35, 60, 45, 70, 55, 40, 65, 50, 35, 55, 45, 60, 70, 40, 50,
                65, 35, 55, 45, 60, 70, 50, 40, 65, 35,
              ].map((height, i) => (
                <div
                  key={i}
                  className="w-full rounded-t bg-zinc-300"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
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
          <p className="font-medium text-zinc-700">Drop your audio file here</p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800">
            Select File
            <input
              type="file"
              className="hidden"
              accept=".mp3,.wav"
              onChange={onFileInput}
            />
          </label>
          <p className="text-xs text-zinc-400">MP3 or WAV</p>
        </div>
      )}
    </div>
  );
}
