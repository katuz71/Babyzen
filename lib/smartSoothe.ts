// Локальные звуковые файлы
const WHITE_NOISE_LOCAL = require('@/assets/sounds/white_noise.mp3');
const HEARTBEAT_LOCAL = require('@/assets/sounds/heartbeat.mp3');
const RAIN_LOCAL = require('@/assets/sounds/rain.mp3');
const SHUSH_LOCAL = require('@/assets/sounds/shush.mp3');

// Используем локальные файлы
export const SOOTHING_SOUNDS = {
  WHITE_NOISE: WHITE_NOISE_LOCAL,
  HEARTBEAT: HEARTBEAT_LOCAL,
  RAIN: RAIN_LOCAL,
  SHUSH: SHUSH_LOCAL,
} as const;

export function pickSmartSootheUrl(typeKey: unknown): number {
  switch (typeKey) {
    case 'Sleep':
      return SOOTHING_SOUNDS.WHITE_NOISE;
    case 'Gas':
      return SOOTHING_SOUNDS.HEARTBEAT;
    case 'Unknown':
    case 'Discomfort':
      return SOOTHING_SOUNDS.RAIN;
    default:
      return SOOTHING_SOUNDS.SHUSH;
  }
}
