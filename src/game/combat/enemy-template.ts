export interface EnemyStats {
  maxHealth: number;
  attack: number;
  defense: number;
  magic: number;
  resistance: number;
  speed: number;
  criticalChance: number;
  criticalDamage: number;
}

export interface EnemyTemplate {
  id: string;
  name: string;
  baseLevel: number;
  minimumLevel: number;
  maximumLevel: number;
  minimumSpawnCount: number;
  maximumSpawnCount: number;
  basicAttackType: 'physical' | 'magic';
  baseStats: EnemyStats;
  growthPerLevel: EnemyStats;
}
