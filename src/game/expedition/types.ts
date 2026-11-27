export interface AreaLevelRange {
  minimum: number;
  maximum: number;
}

export interface ExpeditionPlanConfig {
  normalCombatCount: number;
  normalEventPools: string[];
  rareEventChance: number;
  rareEventPool: string;
}

interface PlannedEncounterBase {
  position: number;
  seed: number;
}

export interface PlannedCombatEncounter extends PlannedEncounterBase {
  kind: 'combat';
  combatNumber: number;
  level: number;
  difficulty: 'normal' | 'upper-bound';
}

export interface PlannedEventEncounter extends PlannedEncounterBase {
  kind: 'event';
  eventNumber: number;
  eventPool: string;
}

export interface PlannedFinalEncounter extends PlannedEncounterBase {
  kind: 'final';
  combatNumber: number;
  level: number;
  difficulty: 'upper-bound';
  rareEventChance: number;
  rareEventPool: string;
}

export type PlannedEncounter =
  | PlannedCombatEncounter
  | PlannedEventEncounter
  | PlannedFinalEncounter;

export interface ExpeditionPlan {
  seed: number;
  encounters: PlannedEncounter[];
}
