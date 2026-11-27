import { describe, expect, it } from 'vitest';
import { createPrototypeEncounterPreview } from './encounter-preview.js';

describe('createPrototypeEncounterPreview', () => {
  it('creates a deterministic playable encounter', () => {
    const first = createPrototypeEncounterPreview(12_345);
    const second = createPrototypeEncounterPreview(12_345);

    expect(second).toEqual(first);
    expect(first.combatants.filter((combatant) => combatant.side === 'squad')).toHaveLength(3);
    expect(first.combatants.filter((combatant) => combatant.side === 'enemy')).toHaveLength(3);
    expect(first.rounds.length).toBeGreaterThan(0);
    expect(first.rounds.at(-1)?.health).toBeDefined();
    expect(first.result).toBe('victory');
  });
});
