import { createSeededRandom, deriveSeed } from '../random.js';
import type {
  AreaLevelRange,
  ExpeditionPlan,
  ExpeditionPlanConfig,
  PlannedCombatEncounter,
  PlannedEncounter,
  PlannedEventEncounter,
  PlannedFinalEncounter,
} from './types.js';

export function generateExpeditionPlan(
  seed: number,
  areaLevels: AreaLevelRange,
  config: ExpeditionPlanConfig
): ExpeditionPlan {
  assertInputs(seed, areaLevels, config);

  const layoutRandom = createSeededRandom(deriveSeed(seed, 'layout'));
  const eventGaps = chooseEventGaps(
    config.normalCombatCount,
    config.normalEventPools.length,
    layoutRandom.next
  );

  const encounters: PlannedEncounter[] = [];
  let eventNumber = 1;

  for (
    let combatIndex = 0;
    combatIndex < config.normalCombatCount;
    combatIndex += 1
  ) {
    if (eventGaps.has(combatIndex)) {
      const eventPool = config.normalEventPools[eventNumber - 1];
      if (!eventPool) throw new Error('Event pool configuration is incomplete.');
      encounters.push(
        createEventSlot(
          seed,
          eventNumber,
          encounters.length + 1,
          eventPool
        )
      );
      eventNumber += 1;
    }

    encounters.push(
      createNormalCombat(seed, combatIndex + 1, encounters.length + 1, areaLevels)
    );
  }

  encounters.push(
    createFinalSlot(
      seed,
      config.normalCombatCount + 1,
      encounters.length + 1,
      areaLevels.maximum,
      config.rareEventChance,
      config.rareEventPool
    )
  );

  return { seed, encounters };
}

function chooseEventGaps(
  combatCount: number,
  eventCount: number,
  nextRandom: () => number
): Set<number> {
  const gaps = Array.from({ length: combatCount }, (_, index) => index);

  for (let index = gaps.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom() * (index + 1));
    const current = gaps[index];
    const replacement = gaps[swapIndex];

    if (current === undefined || replacement === undefined) {
      throw new Error('Failed to generate expedition layout.');
    }

    gaps[index] = replacement;
    gaps[swapIndex] = current;
  }

  return new Set(gaps.slice(0, eventCount));
}

function createNormalCombat(
  expeditionSeed: number,
  combatNumber: number,
  position: number,
  levels: AreaLevelRange
): PlannedCombatEncounter {
  const seed = deriveSeed(expeditionSeed, `combat-${combatNumber}`);
  const random = createSeededRandom(seed);
  const level =
    levels.minimum +
    Math.floor(random.next() * (levels.maximum - levels.minimum + 1));

  return {
    kind: 'combat',
    position,
    seed,
    combatNumber,
    level,
    difficulty: 'normal',
  };
}

function createFinalSlot(
  expeditionSeed: number,
  combatNumber: number,
  position: number,
  maximumLevel: number,
  rareEventChance: number,
  rareEventPool: string
): PlannedFinalEncounter {
  return {
    kind: 'final',
    position,
    seed: deriveSeed(expeditionSeed, 'final-slot'),
    combatNumber,
    level: maximumLevel,
    difficulty: 'upper-bound',
    rareEventChance,
    rareEventPool,
  };
}

function createEventSlot(
  expeditionSeed: number,
  eventNumber: number,
  position: number,
  eventPool: string
): PlannedEventEncounter {
  return {
    kind: 'event',
    position,
    seed: deriveSeed(expeditionSeed, `event-${eventNumber}`),
    eventNumber,
    eventPool,
  };
}

function assertInputs(
  seed: number,
  areaLevels: AreaLevelRange,
  config: ExpeditionPlanConfig
): void {
  if (!Number.isInteger(seed)) {
    throw new Error('Expedition seed must be an integer.');
  }

  if (
    !Number.isInteger(areaLevels.minimum) ||
    !Number.isInteger(areaLevels.maximum) ||
    areaLevels.minimum < 1 ||
    areaLevels.maximum < areaLevels.minimum
  ) {
    throw new Error('Area level range must contain valid positive integers.');
  }

  if (
    !Number.isInteger(config.normalCombatCount) ||
    config.normalCombatCount < 1 ||
    !Array.isArray(config.normalEventPools) ||
    config.normalEventPools.some((pool) => pool.length === 0)
  ) {
    throw new Error('Encounter configuration is invalid.');
  }

  if (config.normalEventPools.length > config.normalCombatCount) {
    throw new Error('Encounter counts would force adjacent events.');
  }

  if (
    !Number.isFinite(config.rareEventChance) ||
    config.rareEventChance < 0 ||
    config.rareEventChance > 1
  ) {
    throw new Error('Rare event chance must be between 0 and 1.');
  }

  if (config.rareEventPool.length === 0) {
    throw new Error('Rare event pool is required.');
  }
}
