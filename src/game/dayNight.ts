export const DAY_CYCLE_TICKS = 160;
export const NIGHT_START_HOUR = 20;
export const DAY_START_HOUR = 6;
export const DAY_TO_NIGHT_RATIO = 1.5;
export const NIGHT_DURATION_TICKS = DAY_CYCLE_TICKS / (DAY_TO_NIGHT_RATIO + 1);
export const DAY_DURATION_TICKS = DAY_CYCLE_TICKS - NIGHT_DURATION_TICKS;

const INITIAL_HOUR = 8;
const DAY_DURATION_HOURS = NIGHT_START_HOUR - DAY_START_HOUR;
const NIGHT_DURATION_HOURS = 24 - DAY_DURATION_HOURS;
const INITIAL_DAY_OFFSET_TICKS =
  (INITIAL_HOUR - DAY_START_HOUR) / DAY_DURATION_HOURS * DAY_DURATION_TICKS;

export type DayCycle = {
  hour: number;
  isNight: boolean;
  daylight: number;
  cycleIndex: number;
};

export function getDayCycle(tick: number): DayCycle {
  const safeTick = Math.max(0, Math.floor(tick));
  const phaseTick = (safeTick + INITIAL_DAY_OFFSET_TICKS) % DAY_CYCLE_TICKS;
  const hour = phaseTick < DAY_DURATION_TICKS
    ? DAY_START_HOUR + phaseTick / DAY_DURATION_TICKS * DAY_DURATION_HOURS
    : (
      NIGHT_START_HOUR +
      (phaseTick - DAY_DURATION_TICKS) / NIGHT_DURATION_TICKS * NIGHT_DURATION_HOURS
    ) % 24;
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
