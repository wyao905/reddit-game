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

  it('starts combat with carried squad health and keeps downed members inactive', () => {
    const outcome = resolveCombat(
      {
        ...wolfPackEncounter,
        startingHealth: { mara: 12, oren: 0, tavi: 20 },
      },
      5
    );

    expect(outcome.log.some((entry) => entry.actorId === 'oren')).toBe(false);
    expect(outcome.squad.find((member) => member.id === 'oren')?.health).toBe(0);
    expect(outcome.squad.find((member) => member.id === 'mara')?.health).toBeLessThanOrEqual(12);
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
