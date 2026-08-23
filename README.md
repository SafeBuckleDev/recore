# Recore Studio

A browser-based audio editor built with Next.js and the Web Audio API. Upload audio files, adjust playback settings in real-time, and export your edited tracks.

## Features

- **File Upload** — Drag-and-drop or click to upload .mp3 and .wav files
- **Playback Controls** — Play, pause, rewind 5 seconds, forward 5 seconds
- **Waveform Visualization** — Interactive waveform display with seek support
- **Speed Control** — Adjust playback speed from 0.25x to 4x
- **Reverb Effect** — Add reverb with adjustable wet/dry mix
- **Volume Control** — Adjust volume from 0% to 100%
- **Progress Slider** — Scrub through the track with a range input
- **Export** — Download your edited audio as an MP3 file

## Tech Stack

- [Next.js 16](https://nextjs.org/) — React framework
- [React 19](https://react.dev/) — UI library
- [Tailwind CSS 4](https://tailwindcss.com/) — Styling
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — Audio processing and effects

## Getting Started

```bash
# Install dependencies
pnpm install

# Run the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

The app uses the Web Audio API to process audio in the browser:

- **AudioContext** handles playback and real-time effects
- **ConvolverNode** generates reverb using a synthetic impulse response
- **GainNode** controls volume
- **OfflineAudioContext** renders the final mix during export

No audio data is sent to a server — everything runs locally in your browser.
