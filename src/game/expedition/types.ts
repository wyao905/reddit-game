export interface AreaLevelRange {
  minimum: number;
  maximum: number;
}

export interface ExpeditionPlanConfig {
  normalCombatCount: number;
  normalEventCount: number;
  rareEventChance: number;
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
  rarity: 'normal' | 'rare';
}

export type PlannedEncounter =
  | PlannedCombatEncounter
  | PlannedEventEncounter;

export interface ExpeditionPlan {
  seed: number;
  encounters: PlannedEncounter[];
}
