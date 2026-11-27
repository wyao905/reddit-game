import { resolveCombat } from '../game/combat/engine.js';
import { prototypeSquad } from '../game/combat/fixtures.js';
import type {
  CombatantDefinition,
  CombatOutcome,
  EncounterDefinition,
} from '../game/combat/types.js';
import { materializeCombatEncounter } from '../game/expedition/combat-materializer.js';
import { prototypeWolf } from '../game/expedition/prototype-content.js';
import type { PlannedCombatEncounter } from '../game/expedition/types.js';
import type {
  CombatRoundView,
  CombatantView,
  EncounterPreviewResponse,
} from '../shared/api.js';

export function createPrototypeEncounterPreview(
  seed: number
): EncounterPreviewResponse {
  const plannedCombat: PlannedCombatEncounter = {
    kind: 'combat',
    position: 1,
    seed,
    combatNumber: 1,
    level: 4,
    difficulty: 'normal',
  };
  const encounter = materializeCombatEncounter(
    plannedCombat,
    prototypeSquad,
    [prototypeWolf]
  );
  const outcome = resolveCombat(encounter, seed);

  return createEncounterPreview(encounter, outcome);
}

export function createEncounterPreview(
  encounter: EncounterDefinition,
  outcome: CombatOutcome
): EncounterPreviewResponse {
  const combatants = [...encounter.squad, ...encounter.enemies];

  return {
    name: encounter.name,
    result: outcome.result,
    combatants: combatants.map(toCombatantView),
    rounds: buildRoundViews(
      combatants,
      outcome.rounds,
      outcome.log,
      encounter.startingHealth
    ),
  };
}

function toCombatantView(combatant: CombatantDefinition): CombatantView {
  return {
    id: combatant.id,
    name: combatant.name,
    side: combatant.side,
    maxHealth: combatant.maxHealth,
    attack: combatant.attack,
    defense: combatant.defense,
    magic: combatant.magic,
    resistance: combatant.resistance,
    speed: combatant.speed,
    criticalChance: combatant.criticalChance,
    criticalDamage: combatant.criticalDamage,
  };
}

function buildRoundViews(
  combatants: CombatantDefinition[],
  roundCount: number,
  log: ReturnType<typeof resolveCombat>['log'],
  startingHealth: Record<string, number> | undefined
): CombatRoundView[] {
  const health = Object.fromEntries(
    combatants.map((combatant) => [
      combatant.id,
      startingHealth?.[combatant.id] ?? combatant.maxHealth,
    ])
  );
  const rounds: CombatRoundView[] = [];

  for (let round = 1; round <= roundCount; round += 1) {
    const entries = log.filter((entry) => entry.round === round);

    for (const entry of entries) {
      const targetId = entry.targetIds[0];
      if (targetId !== undefined) health[targetId] = entry.targetHealthAfter;
    }

    rounds.push({
      number: round,
      actions: entries.flatMap((entry) => {
        const targetId = entry.targetIds[0];
        return targetId === undefined
          ? []
          : [
              {
                actorId: entry.actorId,
                targetId,
                message: entry.message,
                critical: entry.critical ?? false,
              },
            ];
      }),
      health: { ...health },
    });
  }

  return rounds;
}
