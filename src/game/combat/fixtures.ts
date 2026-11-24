import type { CombatantDefinition, EncounterDefinition } from './types.js';

const sampleSquad: CombatantDefinition[] = [
  {
    id: 'mara',
    name: 'Mara',
    side: 'squad',
    maxHealth: 56,
    attack: 10,
    defense: 9,
    skill: {
      kind: 'taunt',
      name: 'Shield Challenge',
      damageMultiplier: 0.75,
    },
  },
  {
    id: 'oren',
    name: 'Oren',
    side: 'squad',
    maxHealth: 38,
    attack: 16,
    defense: 3,
    skill: {
      kind: 'damage',
      name: 'Power Shot',
      damageMultiplier: 1.45,
    },
  },
  {
    id: 'tavi',
    name: 'Tavi',
    side: 'squad',
    maxHealth: 42,
    attack: 8,
    defense: 4,
    skill: {
      kind: 'heal',
      name: 'Mending Light',
      healing: 11,
    },
  },
];

export const golemEncounter: EncounterDefinition = {
  id: 'fixture-stone-golem',
  name: 'Stone Golem',
  squad: sampleSquad,
  enemies: [
    {
      id: 'stone-golem',
      name: 'Stone Golem',
      side: 'enemy',
      maxHealth: 90,
      attack: 15,
      defense: 7,
    },
  ],
};

export const wolfPackEncounter: EncounterDefinition = {
  id: 'fixture-wolf-pack',
  name: 'Wolf Pack',
  squad: sampleSquad,
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
  };
}
