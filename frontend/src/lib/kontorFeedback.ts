const KONTOR_SOUND_URL =
  "/sounds/kontor_harcama.mp3?v=20260701-2";

let kontorAudio: HTMLAudioElement | null = null;
let kontorAudioContext: AudioContext | null = null;
let removeUnlockListeners: (() => void) | null = null;

function getKontorAudio() {
  if (typeof window === "undefined") return null;

  if (!kontorAudio) {
    kontorAudio = new Audio(KONTOR_SOUND_URL);
    kontorAudio.preload = "auto";
    kontorAudio.volume = 0.9;
    kontorAudio.setAttribute("playsinline", "true");
    kontorAudio.load();
  }

  return kontorAudio;
}

function getKontorAudioContext() {
  if (typeof window === "undefined") return null;

  if (kontorAudioContext) {
    return kontorAudioContext;
  }

  const AudioContextConstructor =
    window.AudioContext ||
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;

  if (!AudioContextConstructor) {
    return null;
  }

  kontorAudioContext = new AudioContextConstructor();
  return kontorAudioContext;
}

async function unlockKontorSound() {
  const context = getKontorAudioContext();

  if (context?.state === "suspended") {
    try {
      await context.resume();
    } catch {
      // Tarayıcı HTMLAudio oynatımını yine de destekleyebilir.
    }
  }

  const audio = getKontorAudio();

  if (audio) {
    const previousMuted = audio.muted;
    const previousVolume = audio.volume;

    audio.muted = true;
    audio.volume = 0;

    try {
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // İlk kullanıcı etkileşiminde tekrar denenecektir.
    } finally {
      audio.muted = previousMuted;
      audio.volume = previousVolume || 0.9;
    }
  }

  removeUnlockListeners?.();
}

export function registerKontorSoundUnlock() {
  if (typeof window === "undefined") {
    return () => {};
  }

  if (removeUnlockListeners) {
    return removeUnlockListeners;
  }

  const handleUnlock = () => {
    void unlockKontorSound();
  };

  const removeListeners = () => {
    window.removeEventListener("pointerdown", handleUnlock);
    window.removeEventListener("touchstart", handleUnlock);
    window.removeEventListener("keydown", handleUnlock);

    if (removeUnlockListeners === removeListeners) {
      removeUnlockListeners = null;
    }
  };

  removeUnlockListeners = removeListeners;

  window.addEventListener("pointerdown", handleUnlock, {
    passive: true,
    once: true,
  });
  window.addEventListener("touchstart", handleUnlock, {
    passive: true,
    once: true,
  });
  window.addEventListener("keydown", handleUnlock, {
    once: true,
  });

  getKontorAudio();

  return removeListeners;
}

async function playWebAudioFallback() {
  const context = getKontorAudioContext();

  if (!context) {
    return false;
  }

  try {
    if (context.state === "suspended") {
      await context.resume();
    }

    const now = context.currentTime;
    const masterGain = context.createGain();

    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.18, now + 0.015);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
    masterGain.connect(context.destination);

    const notes = [
      { frequency: 1174.66, start: 0, duration: 0.11 },
      { frequency: 1567.98, start: 0.1, duration: 0.13 },
      { frequency: 2093, start: 0.22, duration: 0.2 },
    ];

    notes.forEach(({ frequency, start, duration }) => {
      const oscillator = context.createOscillator();
      const noteGain = context.createGain();
      const noteStart = now + start;
      const noteEnd = noteStart + duration;

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, noteStart);

      noteGain.gain.setValueAtTime(0.0001, noteStart);
      noteGain.gain.exponentialRampToValueAtTime(0.55, noteStart + 0.01);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

      oscillator.connect(noteGain);
      noteGain.connect(masterGain);

      oscillator.start(noteStart);
      oscillator.stop(noteEnd + 0.02);
    });

    return true;
  } catch {
    return false;
  }
}

export async function playKontorHarcamaSound() {
  if (typeof window === "undefined") {
    return false;
  }

  const audio = getKontorAudio();

  if (audio) {
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      audio.volume = 0.9;

      await audio.play();
      return true;
    } catch {
      // MP3 oynatılamazsa Web Audio geri dönüşü devreye girer.
    }
  }

  return playWebAudioFallback();
}