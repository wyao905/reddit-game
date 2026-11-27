export type CombatSide = 'squad' | 'enemy';
export type DamageType = 'physical' | 'magic';

export type CombatSkill =
  | {
      kind: 'taunt';
      name: string;
      damageMultiplier: number;
      damageType: DamageType;
    }
  | {
      kind: 'damage';
      name: string;
      damageMultiplier: number;
      damageType: DamageType;
    }
  | {
      kind: 'heal';
      name: string;
      healingMultiplier: number;
    };

export interface CombatantDefinition {
  id: string;
  name: string;
  side: CombatSide;
  maxHealth: number;
  attack: number;
  defense: number;
  magic: number;
  resistance: number;
  speed: number;
  criticalChance: number;
  criticalDamage: number;
  basicAttackType: DamageType;
  skill?: CombatSkill;
}

export interface EncounterDefinition {
  id: string;
  name: string;
  squad: CombatantDefinition[];
  enemies: CombatantDefinition[];
  startingHealth?: Record<string, number>;
  maxRounds?: number;
}

export interface CombatantState extends CombatantDefinition {
  health: number;
  taunting: boolean;
}

export type CombatResult = 'victory' | 'defeat' | 'stalemate';

export interface CombatLogEntry {
  round: number;
  actorId: string;
  action: string;
  targetIds: string[];
  effect: 'damage' | 'heal';
  amount?: number;
  damageType?: DamageType;
  critical?: boolean;
  targetHealthAfter: number;
  message: string;
}

export interface CombatOutcome {
  encounterId: string;
  result: CombatResult;
  rounds: number;
  squad: CombatantState[];
  enemies: CombatantState[];
  log: CombatLogEntry[];
}
