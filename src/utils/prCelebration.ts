import confetti from 'canvas-confetti';

const CELEBRATION_COLORS = ['#FFD700', '#FFA500', '#FF6347', '#00CED1', '#7B68EE', '#32CD32'];
const DURATION_MS = 2500;

/**
 * Triggers a colorful confetti celebration for personal record achievements.
 * Fires streams from both sides of the screen plus a center burst.
 */
export function triggerPrCelebration(): void {
  const end = Date.now() + DURATION_MS;

  const frame = () => {
    void confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: CELEBRATION_COLORS
    });
    void confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: CELEBRATION_COLORS
    });
    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();

  void confetti({
    particleCount: 100,
    spread: 100,
    origin: { y: 0.55 },
    colors: CELEBRATION_COLORS
  });
}
