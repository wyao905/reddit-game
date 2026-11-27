import { prototypeSquad } from '../game/combat/fixtures.js';
import { prototypeEventRegistry } from '../game/expedition/events/registry.js';
import {
  createCurrentCombat,
  getActiveEventModel,
  getExpeditionRewards,
  type ExpeditionSession,
} from '../game/expedition/session.js';
import type {
  CombatantView,
  ExpeditionStageView,
  ExpeditionView,
} from '../shared/api.js';
import { createEncounterPreview } from './encounter-preview.js';

export function createExpeditionView(
  session: ExpeditionSession
): ExpeditionView {
  return {
    status: session.status,
    position: Math.min(
      session.currentIndex + 1,
      session.plan.encounters.length
    ),
    encounterCount: session.plan.encounters.length,
    squad: prototypeSquad.map((member) => ({
      ...toCombatantView(member),
      health: session.squadHealth[member.id] ?? member.maxHealth,
    })),
    stage: createStage(session),
  };
}

function createStage(session: ExpeditionSession): ExpeditionStageView {
  if (session.phase === 'complete') {
    const rewards = getExpeditionRewards(session);
    return {
      kind: 'complete',
      supplies: rewards.supplies,
      rareRewards: rewards.rare,
    };
  }

  if (session.phase === 'summary') {
    if (!session.summary) throw new Error('Expedition summary is missing.');
    return { kind: 'summary', ...session.summary };
  }

  if (session.activeEncounter?.kind === 'combat') {
    const combat = createCurrentCombat(session);
    return {
      kind: 'combat',
      combat: createEncounterPreview(combat.encounter, combat.outcome),
    };
  }

  const event = getActiveEventModel(session, prototypeEventRegistry);
  if (!event) throw new Error('Expedition encounter is missing.');
  return {
    kind: 'event',
    title: event.title,
    description: event.description,
    options: event.choices.map((choice) => ({
      action: choice.id,
      label: choice.label,
      description: choice.description,
    })),
  };
}

function toCombatantView(
  combatant: (typeof prototypeSquad)[number]
): CombatantView {
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
