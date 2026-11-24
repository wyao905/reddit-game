import { describe, expect, it } from 'vitest';
import { resolveCombat } from './engine.js';
import { golemEncounter, wolfPackEncounter } from './fixtures.js';

describe('combat skill behavior', () => {
  it('routes enemy attacks to a living taunting member', () => {
    const outcome = resolveCombat(wolfPackEncounter, 99);
    const enemyAttacks = outcome.log.filter(
      (entry) => entry.actorId.startsWith('wolf-') && entry.action === 'Attack'
    );

    expect(enemyAttacks.length).toBeGreaterThan(0);
    expect(enemyAttacks.every((entry) => entry.targetIds[0] === 'mara')).toBe(
      true
    );
  });

  it('uses healing after a squad member takes damage', () => {
    const outcome = resolveCombat(golemEncounter, 42);
    const healing = outcome.log.find((entry) => entry.action === 'Mending Light');

    expect(healing).toBeDefined();
    expect(healing?.amount).toBeGreaterThan(0);
  });
});
