import { describe, expect, it } from 'vitest';
import type { EnemyTemplate } from '../combat/enemy-template.js';
import { resolveCombat } from '../combat/engine.js';
import { golemEncounter } from '../combat/fixtures.js';
import type { CombatantDefinition } from '../combat/types.js';
import { materializeCombatEncounter } from './combat-materializer.js';
import type { PlannedCombatEncounter } from './types.js';

const squad: CombatantDefinition[] = golemEncounter.squad;

const enemyCatalog: EnemyTemplate[] = [
  {
    ...createEnemyTemplate(
      'stone-golem',
      'Stone Golem',
      {
        maxHealth: 90,
        attack: 15,
        defense: 7,
        magic: 0,
        resistance: 8,
        speed: 4,
        criticalChance: 0.05,
        criticalDamage: 1.5,
      },
      {
        maxHealth: 12,
        attack: 3,
        defense: 1,
        magic: 0,
        resistance: 1,
        speed: 0,
        criticalChance: 0,
        criticalDamage: 0,
      }
    ),
    minimumSpawnCount: 1,
    maximumSpawnCount: 1,
  },
  createEnemyTemplate('grey-wolf', 'Grey Wolf'),
  createEnemyTemplate('lean-wolf', 'Lean Wolf'),
  createEnemyTemplate('scarred-wolf', 'Scarred Wolf'),
];

const plannedCombat: PlannedCombatEncounter = {
  kind: 'combat',
  position: 2,
  seed: 1_234,
  combatNumber: 1,
  level: 4,
  difficulty: 'normal',
};

describe('materializeCombatEncounter', () => {
  it('reproduces the same encounter from the same plan and catalog', () => {
    const first = materializeCombatEncounter(plannedCombat, squad, enemyCatalog);
    const second = materializeCombatEncounter(plannedCombat, squad, enemyCatalog);

    expect(second).toEqual(first);
  });

  it('selects only templates that support the planned level', () => {
    const lowLevelEnemy = createEnemyTemplate('young-wolf', 'Young Wolf');
    lowLevelEnemy.minimumLevel = 1;
    lowLevelEnemy.baseLevel = 2;
    lowLevelEnemy.maximumLevel = 3;
    const golem = enemyCatalog[0];

    if (golem === undefined) {
      throw new Error('Missing golem test template.');
    }

    const encounter = materializeCombatEncounter(
      plannedCombat,
      squad,
      [lowLevelEnemy, golem]
    );

    expect(encounter.enemyTemplateId).toBe('stone-golem');
  });

  it('scales enemy stats from the template base level', () => {
    const golem = enemyCatalog[0];

    if (golem === undefined) {
      throw new Error('Missing golem test template.');
    }

    const encounter = materializeCombatEncounter(
      { ...plannedCombat, level: 5 },
      squad,
      [golem]
    );

    expect(encounter.enemies[0]).toMatchObject({
      maxHealth: 102,
      attack: 18,
      defense: 8,
      resistance: 9,
    });
  });

  it('supports single enemies and enemy groups in the combat engine', () => {
    const golemTemplate = enemyCatalog[0];
    const wolfTemplate = enemyCatalog[1];

    if (golemTemplate === undefined || wolfTemplate === undefined) {
      throw new Error('Missing enemy test templates.');
    }

    const golem = materializeCombatEncounter(plannedCombat, squad, [
      golemTemplate,
    ]);
    const wolves = materializeCombatEncounter(plannedCombat, squad, [
      { ...wolfTemplate, minimumSpawnCount: 3, maximumSpawnCount: 3 },
    ]);

    expect(golem.enemies).toHaveLength(1);
    expect(wolves.enemies).toHaveLength(3);
    expect(resolveCombat(golem, plannedCombat.seed).encounterId).toBe(golem.id);
    expect(resolveCombat(wolves, plannedCombat.seed).encounterId).toBe(wolves.id);
  });

  it('uses an individual enemy spawn range for solo and group encounters', () => {
    const wolfTemplate = enemyCatalog[1];

    if (wolfTemplate === undefined) {
      throw new Error('Missing wolf test template.');
    }

    const observedCounts = new Set<number>();

    for (let seed = 0; seed < 100; seed += 1) {
      const encounter = materializeCombatEncounter(
        { ...plannedCombat, seed },
        squad,
        [wolfTemplate]
      );

      observedCounts.add(encounter.enemies.length);
      expect(encounter.enemies.every((enemy) => enemy.name === 'Grey Wolf')).toBe(
        true
      );
    }

    expect([...observedCounts].sort()).toEqual([1, 2, 3]);
  });

  it('reports when no template supports the planned level', () => {
    expect(() =>
      materializeCombatEncounter(
        { ...plannedCombat, level: 8 },
        squad,
        enemyCatalog
      )
    ).toThrow('No enemy templates support level 8.');
  });
});

function createEnemyTemplate(
  id: string,
  name: string,
  baseStats = {
    maxHealth: 24,
    attack: 9,
    defense: 2,
    magic: 0,
    resistance: 2,
    speed: 11,
    criticalChance: 0.1,
    criticalDamage: 1.5,
  },
  growthPerLevel = {
    maxHealth: 4,
    attack: 2,
    defense: 1,
    magic: 0,
    resistance: 1,
    speed: 0,
    criticalChance: 0,
    criticalDamage: 0,
  }
): EnemyTemplate {
  return {
    id,
    name,
    baseLevel: 4,
    minimumLevel: 4,
    maximumLevel: 5,
    minimumSpawnCount: 1,
    maximumSpawnCount: 3,
    basicAttackType: 'physical',
    baseStats,
    growthPerLevel,
  };
}
