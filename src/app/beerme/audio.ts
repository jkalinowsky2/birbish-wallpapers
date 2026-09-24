import type { ProjectileKind } from "./BeerMeBattlefield";

let audioContext: AudioContext | null = null;
let muted = false;
let musicMuted = false;
let lastMiniExplosion = 0;
let musicElement: HTMLAudioElement | null = null;

function context() {
  if (typeof window === "undefined") return null;
  audioContext ??= new AudioContext();
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

function tone(frequency: number, duration: number, options: {
  delay?: number;
  endFrequency?: number;
  gain?: number;
  type?: OscillatorType;
} = {}) {
  if (muted) return;
  const ctx = context();
  if (!ctx) return;
  const start = ctx.currentTime + (options.delay ?? 0);
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();
  oscillator.type = options.type ?? "square";
  oscillator.frequency.setValueAtTime(frequency, start);
  if (options.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, start + duration);
  }
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(options.gain ?? 0.055, start + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function noise(duration: number, gain: number, delay = 0) {
  if (muted) return;
  const ctx = context();
  if (!ctx) return;
  const length = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) channel[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const envelope = ctx.createGain();
  const start = ctx.currentTime + delay;
  source.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, start);
  filter.frequency.exponentialRampToValueAtTime(90, start + duration);
  envelope.gain.setValueAtTime(gain, start);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter).connect(envelope).connect(ctx.destination);
  source.start(start);
}

export function setAudioMuted(value: boolean) {
  muted = value;
  if (typeof window !== "undefined") window.localStorage.setItem("beerme-muted", String(value));
}

export function storedAudioMuted() {
  return typeof window !== "undefined" && window.localStorage.getItem("beerme-muted") === "true";
}

export function startMusic() {
  if (musicMuted || typeof window === "undefined") return;
  if (!musicElement) {
    musicElement = new Audio("/audio/beerme.mp3");
    musicElement.loop = true;
    musicElement.preload = "auto";
    musicElement.volume = 0.22;
  }
  void musicElement.play().catch(() => {
    // The next user interaction will retry if the browser blocks autoplay.
  });
}

export function stopMusic() {
  if (!musicElement) return;
  musicElement.pause();
  musicElement.currentTime = 0;
}

export function setMusicMuted(value: boolean) {
  musicMuted = value;
  if (typeof window !== "undefined") window.localStorage.setItem("beerme-music-muted", String(value));
  if (value) musicElement?.pause();
  else if (musicElement) startMusic();
}

export function storedMusicMuted() {
  return typeof window !== "undefined" && window.localStorage.getItem("beerme-music-muted") === "true";
}

export function playMove() {
  startMusic();
  tone(150, 0.045, { endFrequency: 115, gain: 0.035 });
}

export function playFire(kind: ProjectileKind) {
  startMusic();
  const start = kind === "keg" ? 150 : kind === "tallboy" ? 225 : kind === "twelvepack" ? 180 : 310;
  tone(start, 0.14, { endFrequency: start * 0.45, gain: 0.06 });
  tone(start * 1.5, 0.08, { delay: 0.025, endFrequency: start * 0.8, gain: 0.025 });
}

export function playExplosion(kind: ProjectileKind) {
  const strength = kind === "keg" ? 1.5 : kind === "tallboy" ? 1.2 : 0.75;
  noise(0.16 * strength, 0.1 * strength);
  tone(105 / strength, 0.18 * strength, { endFrequency: 42, gain: 0.055, type: "triangle" });
}

export function playPackOpen() {
  noise(0.09, 0.06);
  tone(540, 0.06, { endFrequency: 240, gain: 0.05 });
  tone(760, 0.045, { delay: 0.04, endFrequency: 420, gain: 0.035 });
}

export function playMiniExplosion() {
  const now = performance.now();
  if (now - lastMiniExplosion < 35) return;
  lastMiniExplosion = now;
  noise(0.07, 0.045);
  tone(145, 0.075, { endFrequency: 70, gain: 0.025, type: "triangle" });
}

export function playDamage(amount: number) {
  const pitch = Math.max(90, 230 - amount * 2.5);
  tone(pitch, 0.08, { endFrequency: pitch * 0.7, gain: 0.05 });
  tone(pitch * 0.72, 0.11, { delay: 0.085, endFrequency: pitch * 0.45, gain: 0.05 });
}

export function playVictory() {
  [262, 330, 392, 523].forEach((frequency, index) => {
    tone(frequency, 0.16, { delay: index * 0.11, gain: 0.05 });
  });
}
