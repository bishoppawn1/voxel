import { describe, expect, it } from 'vitest';
import {
  DAY_CYCLE_TICKS,
  formatWorldTime,
  getDayCycle,
} from './dayNight';

describe('day and night cycle', () => {
  it('starts in daylight, enters night, and returns to morning', () => {
    expect(getDayCycle(0)).toMatchObject({ hour: 8, isNight: false, cycleIndex: 0 });
    expect(getDayCycle(DAY_CYCLE_TICKS / 2)).toMatchObject({ hour: 20, isNight: true });
    expect(getDayCycle(73).isNight).toBe(true);
    expect(getDayCycle(74).isNight).toBe(false);
    expect(getDayCycle(DAY_CYCLE_TICKS)).toMatchObject({
      hour: 8,
      isNight: false,
      cycleIndex: 1,
    });
  });

  it('fades sunlight out after sunset and formats the world clock', () => {
    expect(getDayCycle(0).daylight).toBeGreaterThan(0);
    expect(getDayCycle(DAY_CYCLE_TICKS / 2).daylight).toBe(0);
    expect(formatWorldTime(8)).toBe('8:00 AM');
    expect(formatWorldTime(20.5)).toBe('8:30 PM');
  });
});
