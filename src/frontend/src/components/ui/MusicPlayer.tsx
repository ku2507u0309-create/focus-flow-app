import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Music, Square } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────
   WEB AUDIO AMBIENT SOUND GENERATOR
   Uses the Web Audio API to generate noise patterns directly in
   the browser — no external files, works 100% offline.
   ───────────────────────────────────────────────────────────────── */

function createAudioContext() {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
}

type NoiseKind = "white" | "brown" | "pink" | "rain" | "waves" | "forest" | "binaural_focus" | "cafe";

function generateNoise(ctx: AudioContext, kind: NoiseKind, gainNode: GainNode): ScriptProcessorNode | OscillatorNode[] | null {
  if (kind === "white" || kind === "pink" || kind === "brown") {
    const bufferSize = 4096;
    const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
    let lastOut = 0;
    processor.onaudioprocess = (e) => {
      const out = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (kind === "white") {
          out[i] = white * 0.25;
        } else if (kind === "brown") {
          lastOut = (lastOut + (0.02 * white)) / 1.02;
          out[i] = lastOut * 3.5;
        } else {
          // Pink noise
          out[i] = (white + white * 0.02) * 0.18;
        }
      }
    };
    processor.connect(gainNode);
    gainNode.connect(ctx.destination);
    return processor;
  }

  if (kind === "rain") {
    const bufferSize = 4096;
    const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
    let phase = 0;
    processor.onaudioprocess = (e) => {
      const out = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // Layered noise for rain texture
        const white = Math.random() * 2 - 1;
        phase += 0.01;
        const mod = Math.sin(phase) * 0.1 + 0.9;
        out[i] = white * 0.15 * mod;
      }
    };
    processor.connect(gainNode);
    gainNode.connect(ctx.destination);
    return processor;
  }

  if (kind === "waves") {
    const bufferSize = 4096;
    const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
    let t = 0;
    processor.onaudioprocess = (e) => {
      const out = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        t++;
        const wave = Math.sin(t * 0.0003) * Math.sin(t * 0.0019) * 0.5;
        const noise = (Math.random() * 2 - 1) * 0.12;
        out[i] = (wave + noise) * 0.3;
      }
    };
    processor.connect(gainNode);
    gainNode.connect(ctx.destination);
    return processor;
  }

  if (kind === "forest") {
    const bufferSize = 4096;
    const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
    let t = 0;
    processor.onaudioprocess = (e) => {
      const out = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        t++;
        // Soft rustling: amplitude-modulated noise
        const env = (Math.sin(t * 0.0005) + 1) * 0.5;
        out[i] = (Math.random() * 2 - 1) * 0.1 * env;
      }
    };
    processor.connect(gainNode);
    gainNode.connect(ctx.destination);
    return processor;
  }

  if (kind === "binaural_focus") {
    // 40 Hz binaural: 200 Hz left + 240 Hz right
    const leftOsc = ctx.createOscillator();
    const rightOsc = ctx.createOscillator();
    const leftPan = ctx.createStereoPanner();
    const rightPan = ctx.createStereoPanner();
    leftPan.pan.value = -1;
    rightPan.pan.value = 1;
    leftOsc.frequency.value = 200;
    rightOsc.frequency.value = 240;
    leftOsc.connect(leftPan);
    rightOsc.connect(rightPan);
    leftPan.connect(gainNode);
    rightPan.connect(gainNode);
    gainNode.connect(ctx.destination);
    leftOsc.start();
    rightOsc.start();
    return [leftOsc, rightOsc];
  }

  if (kind === "cafe") {
    // Layered hum + noise for cafe ambiance
    const bufferSize = 4096;
    const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
    const humOsc = ctx.createOscillator();
    humOsc.frequency.value = 120;
    humOsc.connect(gainNode);
    humOsc.start();
    let t = 0;
    processor.onaudioprocess = (e) => {
      const out = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        t++;
        out[i] = (Math.random() * 2 - 1) * 0.06;
      }
    };
    processor.connect(gainNode);
    gainNode.connect(ctx.destination);
    return processor;
  }

  return null;
}

interface Track {
  name: string;
  artist: string;
  category: "focus" | "meditation" | "nature";
  color: string;
  emoji: string;
  noiseKind: NoiseKind;
  description: string;
}

const TRACKS: Track[] = [
  { name: "Brown Noise",      artist: "Deep Focus",       category: "focus",      color: "from-amber-700 to-orange-800",  emoji: "🎛️", noiseKind: "brown",          description: "Smooth, deep noise for concentration" },
  { name: "White Noise",      artist: "Pure Focus",       category: "focus",      color: "from-slate-500 to-zinc-700",    emoji: "📡", noiseKind: "white",          description: "Classic focus-enhancing noise" },
  { name: "Binaural Focus",   artist: "40Hz Gamma",       category: "focus",      color: "from-blue-700 to-indigo-800",   emoji: "🧠", noiseKind: "binaural_focus", description: "40 Hz beats to boost cognitive performance" },
  { name: "Cafe Ambiance",    artist: "Coffee Shop",      category: "focus",      color: "from-amber-600 to-yellow-800",  emoji: "☕", noiseKind: "cafe",           description: "Gentle cafe hum for creative flow" },
  { name: "Tibetan Bowls",    artist: "Meditation Lab",   category: "meditation", color: "from-teal-500 to-cyan-700",     emoji: "🪘", noiseKind: "pink",           description: "Soft pink noise mimicking bowl resonance" },
  { name: "432 Hz Healing",   artist: "Healing Sounds",   category: "meditation", color: "from-green-600 to-emerald-700", emoji: "✨", noiseKind: "binaural_focus", description: "Tuned binaural for relaxed focus" },
  { name: "Rain on Window",   artist: "Nature Sounds",    category: "nature",     color: "from-blue-600 to-slate-700",    emoji: "🌧️", noiseKind: "rain",           description: "Realistic rain texture" },
  { name: "Ocean Waves",      artist: "Nature Sounds",    category: "nature",     color: "from-cyan-600 to-blue-700",     emoji: "🌊", noiseKind: "waves",          description: "Rhythmic ocean waves" },
  { name: "Forest Sounds",    artist: "Nature Sounds",    category: "nature",     color: "from-green-700 to-lime-800",     emoji: "🌲", noiseKind: "forest",         description: "Soft rustling leaves" },
];

type Category = "focus" | "meditation" | "nature";

export default function MusicPlayer() {
  const [activeCategory, setActiveCategory] = useState<Category>("focus");
  const [currentTrack, setCurrentTrack]     = useState<Track | null>(null);
  const [playing, setPlaying]               = useState(false);
  const [volume, setVolume]                 = useState(60);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef     = useRef<GainNode | null>(null);
  const nodeRef     = useRef<ScriptProcessorNode | OscillatorNode[] | null>(null);

  const stopAudio = () => {
    if (nodeRef.current) {
      if (Array.isArray(nodeRef.current)) {
        nodeRef.current.forEach((n) => n.stop());
      } else {
        try { nodeRef.current.disconnect(); } catch {}
      }
      nodeRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
      gainRef.current = null;
    }
  };

  const startAudio = (track: Track) => {
    stopAudio();
    const ctx = createAudioContext();
    const gain = ctx.createGain();
    gain.gain.value = volume / 100;
    audioCtxRef.current = ctx;
    gainRef.current = gain;
    nodeRef.current = generateNoise(ctx, track.noiseKind, gain);
  };

  // Update volume live
  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = volume / 100;
    }
  }, [volume]);

  // Cleanup on unmount
  useEffect(() => () => stopAudio(), []);

  const selectTrack = (track: Track) => {
    if (currentTrack?.name === track.name) {
      if (playing) {
        stopAudio();
        setPlaying(false);
      } else {
        startAudio(track);
        setPlaying(true);
      }
    } else {
      setCurrentTrack(track);
      startAudio(track);
      setPlaying(true);
    }
  };

  const filtered = TRACKS.filter((t) => t.category === activeCategory);
  const CATS: { id: Category; label: string; emoji: string }[] = [
    { id: "focus",      label: "Focus",      emoji: "⚡" },
    { id: "meditation", label: "Meditation", emoji: "🧘" },
    { id: "nature",     label: "Nature",     emoji: "🌿" },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="glass-card-strong p-5">
        <div className="flex items-center gap-3 mb-1">
          <Music className="w-5 h-5 text-primary" />
          <div>
            <p className="section-overline">Ambient Sound</p>
            <h2 className="section-title">Focus Sounds</h2>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Browser-native audio — no internet required. Works right now.</p>
      </div>

      {/* Category Tabs */}
      <div className="glass-card p-1.5 flex gap-1">
        {CATS.map((c) => (
          <button key={c.id} type="button" onClick={() => setActiveCategory(c.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeCategory === c.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <span>{c.emoji}</span><span>{c.label}</span>
          </button>
        ))}
      </div>

      {/* Track list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.map((track, i) => {
            const isActive = currentTrack?.name === track.name;
            return (
              <motion.button key={track.name} type="button"
                initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:16 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => selectTrack(track)}
                className={`w-full glass-card hover-lift p-4 flex items-center gap-4 text-left transition-all ${isActive ? "border-primary/40 bg-primary/5" : ""}`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${track.color} flex items-center justify-center text-2xl shrink-0 shadow-lg ${isActive && playing ? "animate-pulse" : ""}`}>
                  {track.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm truncate ${isActive ? "text-primary" : "text-foreground"}`}>{track.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{track.description}</p>
                </div>
                {isActive && (
                  <div className="shrink-0">
                    {playing
                      ? <Square className="w-5 h-5 text-primary" />
                      : <span className="text-primary text-xs font-bold">Play</span>
                    }
                  </div>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Now Playing */}
      <AnimatePresence>
        {currentTrack && (
          <motion.div initial={{ y:20, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:20, opacity:0 }}
            className="glass-card-strong p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentTrack.color} flex items-center justify-center text-xl shrink-0 ${playing ? "animate-pulse" : ""}`}>
                {currentTrack.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground truncate">{currentTrack.name}</p>
                <p className="text-xs text-muted-foreground">{playing ? "▶ Now playing..." : "Paused"}</p>
              </div>
              <button type="button" onClick={() => selectTrack(currentTrack)}
                className="w-10 h-10 rounded-full btn-premium flex items-center justify-center"
              >
                {playing ? <Square className="w-4 h-4" /> : <span className="text-sm font-bold">▶</span>}
              </button>
            </div>
            {/* Volume */}
            <div className="flex items-center gap-2">
              {volume === 0 ? <VolumeX className="w-4 h-4 text-muted-foreground shrink-0" /> : <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />}
              <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1 h-1.5 rounded-full cursor-pointer accent-primary"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">{volume}%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
