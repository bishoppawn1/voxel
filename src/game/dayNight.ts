export const DAY_CYCLE_TICKS = 160;
export const NIGHT_START_HOUR = 20;
export const DAY_START_HOUR = 6;

export type DayCycle = {
  hour: number;
  isNight: boolean;
  daylight: number;
  cycleIndex: number;
};

export function getDayCycle(tick: number): DayCycle {
  const safeTick = Math.max(0, Math.floor(tick));
  const cycleTick = safeTick % DAY_CYCLE_TICKS;
  const hour = (8 + cycleTick / DAY_CYCLE_TICKS * 24) % 24;
  const sunHeight = Math.sin((hour - DAY_START_HOUR) / 12 * Math.PI);
  return {
    hour,
    isNight: hour >= NIGHT_START_HOUR || hour < DAY_START_HOUR,
    daylight: Math.max(0, Math.min(1, sunHeight)),
    cycleIndex: Math.floor(safeTick / DAY_CYCLE_TICKS),
  };
}

export function formatWorldTime(hour: number) {
  const roundedMinutes = Math.round((hour % 1) * 60 / 5) * 5;
  const normalizedHour = (Math.floor(hour) + Math.floor(roundedMinutes / 60)) % 24;
  const minutes = roundedMinutes % 60;
  const suffix = normalizedHour >= 12 ? 'PM' : 'AM';
  const displayHour = normalizedHour % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${suffix}`;
}
