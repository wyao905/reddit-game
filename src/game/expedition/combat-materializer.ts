import type {
  EnemyStats,
  EnemyTemplate,
} from '../combat/enemy-template.js';
import type {
  CombatantDefinition,
  EncounterDefinition,
} from '../combat/types.js';
import { createSeededRandom, deriveSeed } from '../random.js';
import type { PlannedCombatEncounter } from './types.js';

export interface MaterializedCombatEncounter extends EncounterDefinition {
  enemyTemplateId: string;
  level: number;
  position: number;
}

export function materializeCombatEncounter(
  planned: PlannedCombatEncounter,
  squad: readonly CombatantDefinition[],
  enemyCatalog: readonly EnemyTemplate[]
): MaterializedCombatEncounter {
  assertPlannedCombat(planned);
  validateEnemyCatalog(enemyCatalog);

  const eligibleEnemies = enemyCatalog.filter(
    (enemy) =>
      planned.level >= enemy.minimumLevel &&
      planned.level <= enemy.maximumLevel
  );

  if (eligibleEnemies.length === 0) {
    throw new Error(`No enemy templates support level ${planned.level}.`);
  }

  const selectionRandom = createSeededRandom(
    deriveSeed(planned.seed, 'enemy-template-selection')
  );
  const enemyIndex = Math.floor(selectionRandom.next() * eligibleEnemies.length);
  const enemy = eligibleEnemies[enemyIndex];

  if (enemy === undefined) {
    throw new Error('Failed to select an enemy template.');
  }

  const countRandom = createSeededRandom(
    deriveSeed(planned.seed, 'enemy-spawn-count')
  );
  const enemyCount =
    enemy.minimumSpawnCount +
    Math.floor(
      countRandom.next() *
        (enemy.maximumSpawnCount - enemy.minimumSpawnCount + 1)
    );
  const stats = scaleStats(
    enemy.baseStats,
    enemy.growthPerLevel,
    planned.level - enemy.baseLevel
  );

  return {
    id: `combat-${planned.seed}-${enemy.id}`,
    name: enemyCount === 1 ? enemy.name : `${enemy.name} x${enemyCount}`,
    enemyTemplateId: enemy.id,
    level: planned.level,
    position: planned.position,
    squad: squad.map((member) => ({ ...member })),
    enemies: Array.from({ length: enemyCount }, (_, index) => ({
      id: `${enemy.id}-${index + 1}`,
      name: enemy.name,
      side: 'enemy',
      basicAttackType: enemy.basicAttackType,
      ...stats,
    })),
  };
}

function scaleStats(
  base: EnemyStats,
  growth: EnemyStats,
  levelDifference: number
): EnemyStats {
  const scaled = {
    maxHealth: base.maxHealth + growth.maxHealth * levelDifference,
    attack: base.attack + growth.attack * levelDifference,
    defense: base.defense + growth.defense * levelDifference,
    magic: base.magic + growth.magic * levelDifference,
    resistance: base.resistance + growth.resistance * levelDifference,
    speed: base.speed + growth.speed * levelDifference,
    criticalChance:
      base.criticalChance + growth.criticalChance * levelDifference,
    criticalDamage:
      base.criticalDamage + growth.criticalDamage * levelDifference,
  };

  if (scaled.maxHealth <= 0 || scaled.attack < 0 || scaled.defense < 0) {
    throw new Error('Enemy scaling produced invalid stats.');
  }

  if (
    scaled.magic < 0 ||
    scaled.resistance < 0 ||
    scaled.speed < 0 ||
    scaled.criticalChance < 0 ||
    scaled.criticalChance > 1 ||
    scaled.criticalDamage < 1
  ) {
    throw new Error('Enemy scaling produced invalid stats.');
  }

  return scaled;
}

function assertPlannedCombat(planned: PlannedCombatEncounter): void {
  if (
    !Number.isInteger(planned.level) ||
    planned.level < 1 ||
    !Number.isInteger(planned.seed)
  ) {
    throw new Error('Planned combat must contain a valid level and seed.');
  }
}

function validateEnemyCatalog(enemyCatalog: readonly EnemyTemplate[]): void {
  const enemyIds = new Set<string>();

  for (const enemy of enemyCatalog) {
    assertEnemyTemplate(enemy);

    if (enemyIds.has(enemy.id)) {
      throw new Error(`Enemy ID "${enemy.id}" is duplicated.`);
    }

    enemyIds.add(enemy.id);
  }
}

function assertEnemyTemplate(enemy: EnemyTemplate): void {
  const stats = [
    ...Object.values(enemy.baseStats),
    ...Object.values(enemy.growthPerLevel),
  ];

  if (
    enemy.id.length === 0 ||
    enemy.name.length === 0 ||
    !Number.isInteger(enemy.baseLevel) ||
    !Number.isInteger(enemy.minimumLevel) ||
    !Number.isInteger(enemy.maximumLevel) ||
    enemy.minimumLevel < 1 ||
    enemy.minimumLevel > enemy.baseLevel ||
    enemy.baseLevel > enemy.maximumLevel ||
    !Number.isInteger(enemy.minimumSpawnCount) ||
    !Number.isInteger(enemy.maximumSpawnCount) ||
    enemy.minimumSpawnCount < 1 ||
    enemy.maximumSpawnCount < enemy.minimumSpawnCount ||
    (enemy.basicAttackType !== 'physical' &&
      enemy.basicAttackType !== 'magic') ||
    stats.some((stat) => !Number.isFinite(stat) || stat < 0) ||
    enemy.baseStats.maxHealth === 0 ||
    enemy.baseStats.criticalChance > 1 ||
    enemy.baseStats.criticalDamage < 1
  ) {
    throw new Error(`Enemy template "${enemy.id}" is invalid.`);
  }
}
