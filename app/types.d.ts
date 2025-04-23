declare module 'canvas-confetti' {
  interface ConfettiOptions {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: {
      x?: number;
      y?: number;
    };
    colors?: string[];
    shapes?: string[];
    scalar?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
  }

  interface ConfettiCannon {
    reset: () => void;
    fire: () => void;
  }

  type ConfettiFunction = (options?: ConfettiOptions) => Promise<void>;
  
  interface ConfettiModule extends ConfettiFunction {
    reset: () => void;
    create: (canvas: HTMLCanvasElement, options?: object) => ConfettiCannon;
  }

  const confetti: ConfettiModule;
  export default confetti;
} 