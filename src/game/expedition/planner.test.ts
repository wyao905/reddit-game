import { describe, expect, it } from 'vitest';
import { generateExpeditionPlan } from './planner.js';
import type { ExpeditionPlanConfig, PlannedEncounter } from './types.js';

const areaLevels = { minimum: 4, maximum: 5 };
const sevenEncounterConfig: ExpeditionPlanConfig = {
  normalCombatCount: 4,
  normalEventCount: 2,
  rareEventChance: 0,
};

describe('generateExpeditionPlan', () => {
  it('reproduces the same expedition from the same seed', () => {
    const first = generateExpeditionPlan(1_234, areaLevels, sevenEncounterConfig);
    const second = generateExpeditionPlan(1_234, areaLevels, sevenEncounterConfig);

    expect(second).toEqual(first);
  });

  it('builds the current seven-slot structure without adjacent events', () => {
    const plan = generateExpeditionPlan(42, areaLevels, sevenEncounterConfig);
    const normalEvents = plan.encounters.filter(
      (encounter) => encounter.kind === 'event' && encounter.rarity === 'normal'
    );
    const combats = plan.encounters.filter((encounter) => encounter.kind === 'combat');

    expect(plan.encounters).toHaveLength(7);
    expect(normalEvents).toHaveLength(2);
    expect(combats).toHaveLength(5);
    expect(hasAdjacentEvents(plan.encounters)).toBe(false);
  });

  it('uses a rare event or an upper-bound combat for the final slot', () => {
    const combatPlan = generateExpeditionPlan(99, areaLevels, {
      ...sevenEncounterConfig,
      rareEventChance: 0,
    });
    const rarePlan = generateExpeditionPlan(99, areaLevels, {
      ...sevenEncounterConfig,
      rareEventChance: 1,
    });

    expect(combatPlan.encounters.at(-1)).toMatchObject({
      kind: 'combat',
      level: 5,
      difficulty: 'upper-bound',
    });
    expect(rarePlan.encounters.at(-1)).toMatchObject({
      kind: 'event',
      rarity: 'rare',
    });
    expect(hasAdjacentEvents(rarePlan.encounters)).toBe(false);
  });

  it('keeps normal combat levels inside the area range', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const plan = generateExpeditionPlan(seed, areaLevels, sevenEncounterConfig);

      for (const encounter of plan.encounters) {
        if (encounter.kind !== 'combat' || encounter.difficulty !== 'normal') {
          continue;
        }

        expect(encounter.level).toBeGreaterThanOrEqual(areaLevels.minimum);
        expect(encounter.level).toBeLessThanOrEqual(areaLevels.maximum);
      }
    }
  });

  it('keeps combat and event sequences stable across final outcomes', () => {
    const combatPlan = generateExpeditionPlan(777, areaLevels, {
      ...sevenEncounterConfig,
      rareEventChance: 0,
    });
    const rarePlan = generateExpeditionPlan(777, areaLevels, {
      ...sevenEncounterConfig,
      rareEventChance: 1,
    });

    expect(normalSequence(combatPlan.encounters, 'combat')).toEqual(
      normalSequence(rarePlan.encounters, 'combat')
    );
    expect(normalSequence(combatPlan.encounters, 'event')).toEqual(
      normalSequence(rarePlan.encounters, 'event')
    );
  });

  it('supports changing the encounter counts', () => {
    const plan = generateExpeditionPlan(12, areaLevels, {
      normalCombatCount: 2,
      normalEventCount: 1,
      rareEventChance: 0,
    });

    expect(plan.encounters).toHaveLength(4);
    expect(hasAdjacentEvents(plan.encounters)).toBe(false);
  });

  it('allows the final combat to separate a trailing normal event', () => {
    const plan = generateExpeditionPlan(12, areaLevels, {
      normalCombatCount: 1,
      normalEventCount: 2,
      rareEventChance: 0,
    });

    expect(plan.encounters.map((encounter) => encounter.kind)).toEqual([
      'event',
      'combat',
      'event',
      'combat',
    ]);
    expect(hasAdjacentEvents(plan.encounters)).toBe(false);
  });

  it('rejects counts that would force adjacent event encounters', () => {
    expect(() =>
      generateExpeditionPlan(12, areaLevels, {
        normalCombatCount: 1,
        normalEventCount: 2,
        rareEventChance: 1,
      })
    ).toThrow('Encounter counts would force adjacent events.');
  });
});

function hasAdjacentEvents(encounters: PlannedEncounter[]): boolean {
  return encounters.some(
    (encounter, index) =>
      encounter.kind === 'event' && encounters[index + 1]?.kind === 'event'
  );
}

function normalSequence(
  encounters: PlannedEncounter[],
  kind: PlannedEncounter['kind']
): Array<{ seed: number; level?: number }> {
  return encounters
    .filter((encounter) => {
      if (encounter.kind !== kind) {
        return false;
      }

      return encounter.kind === 'combat'
        ? encounter.difficulty === 'normal'
        : encounter.rarity === 'normal';
    })
    .map((encounter) => ({
      seed: encounter.seed,
      ...(encounter.kind === 'combat' ? { level: encounter.level } : {}),
    }));
}
