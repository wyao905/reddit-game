import { createSeededRandom, deriveSeed } from '../random.js';
import type {
  AreaLevelRange,
  ExpeditionPlan,
  ExpeditionPlanConfig,
  PlannedCombatEncounter,
  PlannedEncounter,
  PlannedEventEncounter,
} from './types.js';

export function generateExpeditionPlan(
  seed: number,
  areaLevels: AreaLevelRange,
  config: ExpeditionPlanConfig
): ExpeditionPlan {
  assertInputs(seed, areaLevels, config);

  const finalRandom = createSeededRandom(deriveSeed(seed, 'final-roll'));
  const finalIsRareEvent = finalRandom.next() < config.rareEventChance;
  const layoutRandom = createSeededRandom(deriveSeed(seed, 'layout'));
  const eventGaps = chooseEventGaps(
    config.normalCombatCount,
    config.normalEventCount,
    finalIsRareEvent,
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
      encounters.push(createNormalEvent(seed, eventNumber, encounters.length + 1));
      eventNumber += 1;
    }

    encounters.push(
      createNormalCombat(seed, combatIndex + 1, encounters.length + 1, areaLevels)
    );
  }

  if (eventGaps.has(config.normalCombatCount)) {
    encounters.push(createNormalEvent(seed, eventNumber, encounters.length + 1));
  }

  encounters.push(
    finalIsRareEvent
      ? createRareEvent(seed, config.normalEventCount + 1, encounters.length + 1)
      : createFinalCombat(
          seed,
          config.normalCombatCount + 1,
          encounters.length + 1,
          areaLevels.maximum
        )
  );

  return { seed, encounters };
}

function chooseEventGaps(
  combatCount: number,
  eventCount: number,
  finalIsRareEvent: boolean,
  nextRandom: () => number
): Set<number> {
  const gapCount = finalIsRareEvent ? combatCount : combatCount + 1;
  const gaps = Array.from({ length: gapCount }, (_, index) => index);

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

function createFinalCombat(
  expeditionSeed: number,
  combatNumber: number,
  position: number,
  maximumLevel: number
): PlannedCombatEncounter {
  return {
    kind: 'combat',
    position,
    seed: deriveSeed(expeditionSeed, 'combat-final'),
    combatNumber,
    level: maximumLevel,
    difficulty: 'upper-bound',
  };
}

function createNormalEvent(
  expeditionSeed: number,
  eventNumber: number,
  position: number
): PlannedEventEncounter {
  return {
    kind: 'event',
    position,
    seed: deriveSeed(expeditionSeed, `event-${eventNumber}`),
    eventNumber,
    rarity: 'normal',
  };
}

function createRareEvent(
  expeditionSeed: number,
  eventNumber: number,
  position: number
): PlannedEventEncounter {
  return {
    kind: 'event',
    position,
    seed: deriveSeed(expeditionSeed, 'event-rare-final'),
    eventNumber,
    rarity: 'rare',
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
    !Number.isInteger(config.normalEventCount) ||
    config.normalEventCount < 0
  ) {
    throw new Error('Encounter counts must be valid integers.');
  }

  const maximumSeparatedEventCount =
    config.rareEventChance === 0
      ? config.normalCombatCount + 1
      : config.normalCombatCount;

  if (config.normalEventCount > maximumSeparatedEventCount) {
    throw new Error('Encounter counts would force adjacent events.');
  }

  if (
    !Number.isFinite(config.rareEventChance) ||
    config.rareEventChance < 0 ||
    config.rareEventChance > 1
  ) {
    throw new Error('Rare event chance must be between 0 and 1.');
  }
}
