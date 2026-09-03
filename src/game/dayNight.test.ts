import { describe, expect, it } from 'vitest';
import {
  DAY_CYCLE_TICKS,
  DAY_DURATION_TICKS,
  DAY_TO_NIGHT_RATIO,
  NIGHT_DURATION_TICKS,
  formatWorldTime,
  getDayCycle,
} from './dayNight';

const NIGHT_TEST_TICK = DAY_CYCLE_TICKS * 3 / 4;

describe('day and night cycle', () => {
  it('starts in daylight, enters night, and returns to morning', () => {
    expect(DAY_CYCLE_TICKS).toBe(160);
    expect(getDayCycle(0)).toMatchObject({ hour: 8, isNight: false, cycleIndex: 0 });
    expect(getDayCycle(NIGHT_TEST_TICK).isNight).toBe(true);
    expect(getDayCycle(146).isNight).toBe(true);
    expect(getDayCycle(147).isNight).toBe(false);
    expect(getDayCycle(DAY_CYCLE_TICKS)).toMatchObject({
      hour: 8,
      isNight: false,
      cycleIndex: 1,
    });
  });

  it('makes daytime last one and a half times as long as nighttime', () => {
    const cycle = Array.from(
      { length: DAY_CYCLE_TICKS },
      (_, tick) => getDayCycle(tick),
    );

    expect(DAY_TO_NIGHT_RATIO).toBe(1.5);
    expect(DAY_DURATION_TICKS).toBe(96);
    expect(NIGHT_DURATION_TICKS).toBe(64);
    expect(cycle.filter(({ isNight }) => !isNight)).toHaveLength(DAY_DURATION_TICKS);
    expect(cycle.filter(({ isNight }) => isNight)).toHaveLength(NIGHT_DURATION_TICKS);
  });

  it('fades sunlight out after sunset and formats the world clock', () => {
    expect(getDayCycle(0).daylight).toBeGreaterThan(0);
    expect(getDayCycle(NIGHT_TEST_TICK).daylight).toBe(0);
    expect(formatWorldTime(8)).toBe('8:00 AM');
    expect(formatWorldTime(20.5)).toBe('8:30 PM');
  });
});
