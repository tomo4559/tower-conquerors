

let audioCtx: AudioContext | null = null;
let bgmAudio: HTMLAudioElement | null = null;
let isBgmMuted = true;
let bgmLoadFailed = false;

export const initAudio = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
        audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
};

export const playCriticalSound = () => {
  if (!audioCtx || audioCtx.state === 'suspended') {
      initAudio();
  }
  
  if (!audioCtx) return;

  try {
      const t = audioCtx.currentTime;
      
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(250, t);
      osc1.frequency.exponentialRampToValueAtTime(50, t + 0.15);
      
      gain1.gain.setValueAtTime(0.05, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      
      osc1.start(t);
      osc1.stop(t + 0.15);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(100, t);
      osc2.frequency.linearRampToValueAtTime(20, t + 0.35); 
      
      gain2.gain.setValueAtTime(0.06, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      
      osc2.start(t);
      osc2.stop(t + 0.35);

  } catch (e) {
      // Ignore audio context errors
  }
};

export const playBGM = async (url: string): Promise<boolean> => {
    if (bgmLoadFailed) return false;

    if (!bgmAudio) {
        bgmAudio = new Audio(url);
        bgmAudio.loop = true;
        bgmAudio.volume = 0.3; // Default volume
        
        bgmAudio.addEventListener('error', (e) => {
            console.error("BGM Error:", e);
            bgmLoadFailed = true;
        });
    } else if (bgmAudio.src !== url) {
        bgmAudio.src = url;
        bgmLoadFailed = false;
    }

    if (isBgmMuted) {
        bgmAudio.pause();
        return true;
    }

    try {
        await bgmAudio.play();
        return true;
    } catch (e) {
        // Autoplay policy usually blocks this until interaction
        // Not strictly an error in logic, just browser policy
        if (e instanceof Error && e.name === 'NotAllowedError') {
             return false;
        }
        // Other errors (network etc)
        bgmLoadFailed = true;
        return false;
    }
};

export const toggleBGM = (muted: boolean) => {
    isBgmMuted = muted;
    if (bgmAudio) {
        if (muted) {
            bgmAudio.pause();
        } else {
            if (!bgmLoadFailed) {
                bgmAudio.play().catch(e => console.log("Play failed", e));
            }
        }
    }
};

export const setAudioVisibility = (visible: boolean) => {
    // 1. Handle AudioContext (SFX)
    if (audioCtx) {
        if (!visible && audioCtx.state === 'running') {
            audioCtx.suspend();
        } else if (visible && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    // 2. Handle BGM
    if (bgmAudio) {
        if (!visible) {
            bgmAudio.pause();
        } else if (visible && !isBgmMuted && !bgmLoadFailed) {
            bgmAudio.play().catch(() => {});
        }
    }
};

export const getBgmError = () => bgmLoadFailed;

export const resetBgmError = () => {
    bgmLoadFailed = false;
    if (bgmAudio) {
        bgmAudio.load(); // Reset element
    }
};