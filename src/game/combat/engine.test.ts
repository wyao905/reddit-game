import { describe, expect, it } from 'vitest';
import { resolveCombat } from './engine.js';
import { golemEncounter, wolfPackEncounter } from './fixtures.js';
import type { EncounterDefinition } from './types.js';

describe('resolveCombat', () => {
  it('reproduces the same combat from the same seed', () => {
    const first = resolveCombat(wolfPackEncounter, 12_345);
    const second = resolveCombat(wolfPackEncounter, 12_345);

    expect(second).toEqual(first);
  });

  it('supports both single enemies and enemy groups', () => {
    const golem = resolveCombat(golemEncounter, 7);
    const wolves = resolveCombat(wolfPackEncounter, 7);

    expect(golem.enemies).toHaveLength(1);
    expect(wolves.enemies).toHaveLength(3);
    expect(golem.result).toBe('victory');
    expect(wolves.result).toBe('victory');
  });

  it('does not mutate the encounter fixture', () => {
    resolveCombat(golemEncounter, 4);

    expect(golemEncounter.squad).not.toHaveProperty('0.health');
    expect(golemEncounter.enemies).not.toHaveProperty('0.health');
  });

  it('rejects encounters without both sides', () => {
    const invalid: EncounterDefinition = {
      id: 'invalid',
      name: 'Invalid encounter',
      squad: [],
      enemies: [],
    };

    expect(() => resolveCombat(invalid, 1)).toThrow(
      'An encounter requires at least one squad member and enemy.'
    );
  });
});
