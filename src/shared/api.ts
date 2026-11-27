export type CombatResult = 'victory' | 'defeat' | 'stalemate';
export type CombatSide = 'squad' | 'enemy';

export interface CombatantView {
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
}

export interface CombatActionView {
  actorId: string;
  targetId: string;
  message: string;
  critical: boolean;
}

export interface CombatRoundView {
  number: number;
  actions: CombatActionView[];
  health: Record<string, number>;
}

export interface EncounterPreviewResponse {
  name: string;
  result: CombatResult;
  combatants: CombatantView[];
  rounds: CombatRoundView[];
}

export interface ApiErrorResponse {
  message: string;
}

export type ExpeditionStatus = 'active' | 'success' | 'failure';
export type ExpeditionAction = string;

export interface ExpeditionMemberView extends CombatantView {
  health: number;
}

export interface ExpeditionEventOptionView {
  action: ExpeditionAction;
  label: string;
  description: string;
}

export type ExpeditionStageView =
  | {
      kind: 'combat';
      combat: EncounterPreviewResponse;
    }
  | {
      kind: 'event';
      title: string;
      description: string;
      options: ExpeditionEventOptionView[];
    }
  | {
      kind: 'summary';
      title: string;
      description: string;
      details: string[];
    }
  | {
      kind: 'complete';
      supplies: number;
      rareRewards: string[];
    };

export interface ExpeditionView {
  status: ExpeditionStatus;
  position: number;
  encounterCount: number;
  squad: ExpeditionMemberView[];
  stage: ExpeditionStageView;
}

export interface ExpeditionActionRequest {
  position: number;
  action: ExpeditionAction;
}

export interface ExpeditionAdvanceRequest {
  position: number;
}
