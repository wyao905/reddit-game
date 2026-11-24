export type CombatSide = 'squad' | 'enemy';

export type CombatSkill =
  | {
      kind: 'taunt';
      name: string;
      damageMultiplier: number;
    }
  | {
      kind: 'damage';
      name: string;
      damageMultiplier: number;
    }
  | {
      kind: 'heal';
      name: string;
      healing: number;
    };

export interface CombatantDefinition {
  id: string;
  name: string;
  side: CombatSide;
  maxHealth: number;
  attack: number;
  defense: number;
  skill?: CombatSkill;
}

export interface EncounterDefinition {
  id: string;
  name: string;
  squad: CombatantDefinition[];
  enemies: CombatantDefinition[];
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
  amount?: number;
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
