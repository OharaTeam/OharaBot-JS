import { describe, it, expect } from 'bun:test';
import { rollDice } from '@/functions/diceRoller';

describe('diceRoller', () => {
  it('deve retornar valores válidos dentro dos limites do dado para d4, d6, d8, d10, d12, d20 e d100', () => {
    const diceSizes = [4, 6, 8, 10, 12, 20, 100];

    for (const sides of diceSizes) {
      for (let i = 0; i < 100; i++) {
        const result = rollDice(sides);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(sides);
        expect(Number.isInteger(result)).toBe(true);
        expect(Number.isNaN(result)).toBe(false);
      }
    }
  });

  it('deve retornar invariavelmente 1 para rollDice(1)', () => {
    for (let i = 0; i < 50; i++) {
      expect(rollDice(1)).toBe(1);
    }
  });

  it('deve lidar de forma estável com valores fracionários sem retornar números quebrados ou NaN', () => {
    const result = rollDice(6.7);
    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(6);
    expect(Number.isNaN(result)).toBe(false);
  });

  it('deve lidar de forma estável com valores negativos ou zero sem retornar NaN', () => {
    expect(rollDice(0)).toBe(1);
    expect(rollDice(-10)).toBe(1);
    expect(Number.isNaN(rollDice(-5))).toBe(false);
  });
});
