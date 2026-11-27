import { describe, expect, it } from 'vitest';
import { generateExpeditionPlan } from './planner.js';
import type { ExpeditionPlanConfig, PlannedEncounter } from './types.js';

const areaLevels = { minimum: 4, maximum: 5 };
const sevenEncounterConfig: ExpeditionPlanConfig = {
  normalCombatCount: 4,
  normalEventPools: ['risk', 'rest'],
  rareEventChance: 0,
  rareEventPool: 'rare',
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
      (encounter) => encounter.kind === 'event'
    );
    const combats = plan.encounters.filter((encounter) => encounter.kind === 'combat');

    expect(plan.encounters).toHaveLength(7);
    expect(normalEvents).toHaveLength(2);
    expect(combats).toHaveLength(4);
    expect(plan.encounters.at(-1)?.kind).toBe('final');
    expect(hasAdjacentEvents(plan.encounters)).toBe(false);
  });

  it('leaves the final rare-event roll unresolved in the plan', () => {
    const plan = generateExpeditionPlan(99, areaLevels, {
      ...sevenEncounterConfig,
      rareEventChance: 0.2,
    });

    expect(plan.encounters.at(-1)).toMatchObject({
      kind: 'final',
      level: 5,
      difficulty: 'upper-bound',
      rareEventChance: 0.2,
      rareEventPool: 'rare',
    });
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

  it('keeps combat and event sequences stable across final probabilities', () => {
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
      normalEventPools: ['risk'],
      rareEventChance: 0,
      rareEventPool: 'rare',
    });

    expect(plan.encounters).toHaveLength(4);
    expect(hasAdjacentEvents(plan.encounters)).toBe(false);
  });

  it('keeps the slot before the unresolved final encounter as combat', () => {
    const plan = generateExpeditionPlan(12, areaLevels, {
      normalCombatCount: 1,
      normalEventPools: ['risk'],
      rareEventChance: 0,
      rareEventPool: 'rare',
    });

    expect(plan.encounters.map((encounter) => encounter.kind)).toEqual([
      'event',
      'combat',
      'final',
    ]);
    expect(hasAdjacentEvents(plan.encounters)).toBe(false);
  });

  it('rejects counts that would force adjacent event encounters', () => {
    expect(() =>
      generateExpeditionPlan(12, areaLevels, {
        normalCombatCount: 1,
        normalEventPools: ['risk', 'rest'],
        rareEventChance: 1,
        rareEventPool: 'rare',
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

      return encounter.kind === kind;
    })
    .map((encounter) => ({
      seed: encounter.seed,
      ...(encounter.kind === 'combat' ? { level: encounter.level } : {}),
    }));
}
