import { describe, expect, it } from 'vitest';
import { resolveCombat } from './engine.js';
import {
  golemEncounter,
  prototypeSquad,
  wolfPackEncounter,
} from './fixtures.js';
import type { CombatantDefinition, EncounterDefinition } from './types.js';

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
    const tavi = getSquadMember('tavi');
    const golem = getEnemy(golemEncounter, 0);
    const outcome = resolveCombat(
      {
        id: 'healing-test',
        name: 'Healing test',
        squad: [tavi],
        enemies: [
          {
            ...golem,
            attack: 30,
            speed: 15,
            criticalChance: 0,
          },
        ],
        maxRounds: 1,
      },
      42
    );
    const healing = outcome.log.find((entry) => entry.action === 'Mending Light');

    expect(healing).toBeDefined();
    expect(healing?.amount).toBe(11);
    expect(healing?.critical).toBeUndefined();
  });

  it('orders each round by speed', () => {
    const outcome = resolveCombat(wolfPackEncounter, 99);

    expect(outcome.log[0]?.actorId).toBe('oren');
  });

  it('allows damaging attacks to critically hit', () => {
    const oren = getSquadMember('oren');
    const target = getEnemy(wolfPackEncounter, 0);
    const outcome = resolveCombat(
      {
        id: 'guaranteed-critical',
        name: 'Guaranteed critical',
        squad: [{ ...oren, criticalChance: 1 }],
        enemies: [{ ...target, maxHealth: 200, speed: 0 }],
        maxRounds: 1,
      },
      7
    );

    expect(outcome.log[0]?.critical).toBe(true);
  });

  it('uses resistance rather than defense against magic damage', () => {
    const tavi = getSquadMember('tavi');
    const target = getEnemy(wolfPackEncounter, 0);
    const lowResistance = resolveCombat(
      magicTestEncounter(tavi, { ...target, defense: 100, resistance: 0 }),
      11
    );
    const highResistance = resolveCombat(
      magicTestEncounter(tavi, { ...target, defense: 0, resistance: 100 }),
      11
    );

    expect(lowResistance.log[0]?.damageType).toBe('magic');
    expect(lowResistance.log[0]?.amount).toBeGreaterThan(1);
    expect(highResistance.log[0]?.amount).toBe(1);
  });
});

function getSquadMember(id: string): CombatantDefinition {
  const member = prototypeSquad.find((candidate) => candidate.id === id);
  if (member === undefined) throw new Error(`Missing fixture member ${id}.`);
  return member;
}

function getEnemy(
  encounter: EncounterDefinition,
  index: number
): CombatantDefinition {
  const enemy = encounter.enemies[index];
  if (enemy === undefined) throw new Error('Missing fixture enemy.');
  return enemy;
}

function magicTestEncounter(
  caster: CombatantDefinition,
  target: CombatantDefinition
): EncounterDefinition {
  const casterWithoutSkill = { ...caster };
  delete casterWithoutSkill.skill;

  return {
    id: 'magic-resistance-test',
    name: 'Magic resistance test',
    squad: [casterWithoutSkill],
    enemies: [{ ...target, maxHealth: 200, speed: 0 }],
    maxRounds: 1,
  };
}
