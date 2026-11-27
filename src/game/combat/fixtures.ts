import type { CombatantDefinition, EncounterDefinition } from './types.js';

export const prototypeSquad: CombatantDefinition[] = [
  {
    id: 'mara',
    name: 'Mara',
    side: 'squad',
    maxHealth: 56,
    attack: 10,
    defense: 9,
    magic: 3,
    resistance: 7,
    speed: 12,
    criticalChance: 0.05,
    criticalDamage: 1.5,
    basicAttackType: 'physical',
    skill: {
      kind: 'taunt',
      name: 'Shield Challenge',
      damageMultiplier: 0.75,
      damageType: 'physical',
    },
  },
  {
    id: 'oren',
    name: 'Oren',
    side: 'squad',
    maxHealth: 38,
    attack: 16,
    defense: 3,
    magic: 2,
    resistance: 3,
    speed: 14,
    criticalChance: 0.2,
    criticalDamage: 1.75,
    basicAttackType: 'physical',
    skill: {
      kind: 'damage',
      name: 'Power Shot',
      damageMultiplier: 1.45,
      damageType: 'physical',
    },
  },
  {
    id: 'tavi',
    name: 'Tavi',
    side: 'squad',
    maxHealth: 42,
    attack: 6,
    defense: 4,
    magic: 12,
    resistance: 8,
    speed: 10,
    criticalChance: 0.05,
    criticalDamage: 1.5,
    basicAttackType: 'magic',
    skill: {
      kind: 'heal',
      name: 'Mending Light',
      healingMultiplier: 0.9,
    },
  },
];

export const golemEncounter: EncounterDefinition = {
  id: 'fixture-stone-golem',
  name: 'Stone Golem',
  squad: prototypeSquad,
  enemies: [
    {
      id: 'stone-golem',
      name: 'Stone Golem',
      side: 'enemy',
      maxHealth: 90,
      attack: 15,
      defense: 7,
      magic: 0,
      resistance: 8,
      speed: 4,
      criticalChance: 0.05,
      criticalDamage: 1.5,
      basicAttackType: 'physical',
    },
  ],
};

export const wolfPackEncounter: EncounterDefinition = {
  id: 'fixture-wolf-pack',
  name: 'Wolf Pack',
  squad: prototypeSquad,
  enemies: [
    createWolf('wolf-1', 'Grey Wolf'),
    createWolf('wolf-2', 'Lean Wolf'),
    createWolf('wolf-3', 'Scarred Wolf'),
  ],
};

function createWolf(id: string, name: string): CombatantDefinition {
  return {
    id,
    name,
    side: 'enemy',
    maxHealth: 24,
    attack: 9,
    defense: 2,
    magic: 0,
    resistance: 2,
    speed: 11,
    criticalChance: 0.1,
    criticalDamage: 1.5,
    basicAttackType: 'physical',
  };
}
