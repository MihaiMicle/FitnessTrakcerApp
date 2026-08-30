import { describe, it, expect } from 'vitest';
import { calculateStrengthStandard } from '../standards';

/*
 * Strength standards are what phase 5's muscle group ranking and worldwide
 * classification will read from, and a wrong answer here looks plausible rather
 * than broken: telling someone they are Intermediate when they are Novice is
 * not a visible bug. The boundaries are pinned exactly for that reason
 */

const MALE = { gender: 'male', age: 25, bodyweight: 100 };

function level(name: string, oneRepMax: number, over = {}) {
  const opts = { ...MALE, ...over };
  return calculateStrengthStandard(
    name,
    oneRepMax,
    opts.bodyweight,
    opts.gender,
    opts.age,
  );
}

describe('calculateStrengthStandard', () => {
  it('is null without a bodyweight or a max', () => {
    expect(level('squat', 0)).toBeNull();
    expect(level('squat', 100, { bodyweight: 0 })).toBeNull();
  });

  it('is null for a lift it has no standard for', () => {
    expect(level('cable crossover', 100)).toBeNull();
  });

  it('matches a lift inside a longer exercise name', () => {
    expect(level('Barbell Bench Press', 80)?.level).toBe('Beginner');
    expect(level('Smith Machine Squat', 100)?.level).toBe('Beginner');
  });

  it('places a lifter below the first ratio as untrained', () => {
    expect(level('squat', 90)?.level).toBe('Untrained');
  });

  it('treats hitting a ratio exactly as reaching that level', () => {
    /* Squat beginner is 1.0x bodyweight */
    expect(level('squat', 100)?.level).toBe('Beginner');
  });

  it('walks every level up to elite', () => {
    expect(level('squat', 125)?.level).toBe('Novice');
    expect(level('squat', 150)?.level).toBe('Intermediate');
    expect(level('squat', 200)?.level).toBe('Advanced');
    expect(level('squat', 250)?.level).toBe('Elite');
    expect(level('squat', 400)?.level).toBe('Elite');
  });

  it('reports the next target, and nothing beyond elite', () => {
    expect(level('squat', 100)?.nextTarget).toBe(125);
    expect(level('squat', 250)?.nextTarget).toBeNull();
  });

  it('rounds the ratio to two places', () => {
    expect(level('deadlift', 183)?.ratio).toBe(1.83);
  });

  it('scales the standards down for women', () => {
    /* 1.0x beginner becomes 0.65x */
    expect(level('squat', 70, { gender: 'female' })?.level).toBe('Beginner');
    expect(level('squat', 70)?.level).toBe('Untrained');
  });

  it('is case insensitive about gender and tolerates it missing', () => {
    expect(level('squat', 70, { gender: 'FEMALE' })?.level).toBe('Beginner');
    expect(level('squat', 100, { gender: '' })?.level).toBe('Beginner');
  });

  it('steps the standards down across the age bands', () => {
    expect(level('squat', 95, { age: 45 })?.level).toBe('Beginner');
    expect(level('squat', 85, { age: 55 })?.level).toBe('Beginner');
    expect(level('squat', 75, { age: 65 })?.level).toBe('Beginner');
    expect(level('squat', 75, { age: 35 })?.level).toBe('Untrained');
  });

  it('leaves the standards alone at the top of the first age band', () => {
    expect(level('squat', 95, { age: 40 })?.level).toBe('Untrained');
  });
});
