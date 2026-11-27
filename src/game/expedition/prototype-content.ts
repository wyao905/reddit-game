import type { EnemyTemplate } from '../combat/enemy-template.js';
import type { AreaLevelRange, ExpeditionPlanConfig } from './types.js';

export const prototypeAreaLevels: AreaLevelRange = {
  minimum: 4,
  maximum: 5,
};

export const prototypePlanConfig: ExpeditionPlanConfig = {
  normalCombatCount: 4,
  normalEventPools: ['risk', 'rest'],
  rareEventChance: 0.2,
  rareEventPool: 'rare',
};

export const prototypeExpeditionRewards = {
  successSupplies: 100,
  failureSupplies: 20,
} as const;

export const prototypeWolf: EnemyTemplate = {
  id: 'grey-wolf',
  name: 'Grey Wolf',
  baseLevel: 4,
  minimumLevel: 4,
  maximumLevel: 5,
  minimumSpawnCount: 3,
  maximumSpawnCount: 3,
  basicAttackType: 'physical',
  baseStats: {
    maxHealth: 24,
    attack: 9,
    defense: 2,
    magic: 0,
    resistance: 2,
    speed: 11,
    criticalChance: 0.1,
    criticalDamage: 1.5,
  },
  growthPerLevel: {
    maxHealth: 4,
    attack: 2,
    defense: 1,
    magic: 0,
    resistance: 1,
    speed: 0,
    criticalChance: 0,
    criticalDamage: 0,
  },
};
