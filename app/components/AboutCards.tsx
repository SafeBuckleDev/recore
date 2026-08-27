export default function AboutCards() {
  const cards = [
    {
      title: "Audio Format Support",
      description:
        "Recore Studio supports popular audio formats such as MP3 and WAV, making it easy to edit tracks from your existing music library.",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      ),
    },
    {
      title: "Playback Controls",
      description:
        "Adjust playback speed, reverb, bass boost, and volume with intuitive sliders. Preview your changes in real time.",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
    {
      title: "Export & Download",
      description:
        "Download your edited tracks in MP3 format with just a click. Fast, free, and entirely in your browser.",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.title}
          className="rounded-xl border border-zinc-200 bg-zinc-50 p-5"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white">
            {card.icon}
          </div>
          <h3 className="mb-1 text-sm font-semibold text-zinc-900">
            {card.title}
          </h3>
          <p className="text-xs leading-relaxed text-zinc-500">
            {card.description}
          </p>
        </div>
      ))}
    </div>
  );
}
