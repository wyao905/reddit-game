import { resolveCombat } from '../combat/engine.js';
import { prototypeSquad } from '../combat/fixtures.js';
import type { CombatOutcome, EncounterDefinition } from '../combat/types.js';
import { createSeededRandom, deriveSeed } from '../random.js';
import { materializeCombatEncounter } from './combat-materializer.js';
import {
  applyEventEffects,
  type EventEffectState,
} from './events/effects.js';
import type { EventModel } from './events/event-model.js';
import type { EventRegistry } from './events/registry.js';
import {
  prototypeAreaLevels,
  prototypePlanConfig,
  prototypeExpeditionRewards,
  prototypeWolf,
} from './prototype-content.js';
import { generateExpeditionPlan } from './planner.js';
import type {
  ExpeditionPlan,
  PlannedCombatEncounter,
  PlannedEncounter,
} from './types.js';

export type ExpeditionStatus = 'active' | 'success' | 'failure';
export type ExpeditionPhase = 'encounter' | 'summary' | 'complete';
export type ExpeditionAction = string;

export type ActiveEncounter =
  | {
      kind: 'combat';
      planned: PlannedCombatEncounter;
    }
  | {
      kind: 'event';
      modelId: string;
      seed: number;
    };

export interface EncounterSummary {
  title: string;
  description: string;
  details: string[];
}

export interface ExpeditionSession {
  seed: number;
  plan: ExpeditionPlan;
  currentIndex: number;
  phase: ExpeditionPhase;
  status: ExpeditionStatus;
  squadHealth: Record<string, number>;
  bonusSupplies: number;
  rareRewards: string[];
  activeEncounter: ActiveEncounter | undefined;
  summary?: EncounterSummary;
}

export interface ExpeditionRewards {
  supplies: number;
  rare: string[];
}

export interface ExpeditionCombat {
  encounter: EncounterDefinition;
  outcome: CombatOutcome;
}

export function createPrototypeExpeditionSession(
  seed: number,
  eventRegistry: EventRegistry
): ExpeditionSession {
  const session: ExpeditionSession = {
    seed,
    plan: generateExpeditionPlan(
      seed,
      prototypeAreaLevels,
      prototypePlanConfig
    ),
    currentIndex: 0,
    phase: 'encounter',
    status: 'active',
    squadHealth: Object.fromEntries(
      prototypeSquad.map((member) => [member.id, member.maxHealth])
    ),
    bonusSupplies: 0,
    rareRewards: [],
    activeEncounter: undefined,
  };

  return enterCurrentEncounter(session, eventRegistry);
}

export function getCurrentEncounter(
  session: ExpeditionSession
): PlannedEncounter | undefined {
  return session.plan.encounters[session.currentIndex];
}

export function createCurrentCombat(
  session: ExpeditionSession
): ExpeditionCombat {
  assertEncounterPhase(session);
  if (session.activeEncounter?.kind !== 'combat') {
    throw new Error('The current expedition encounter is not combat.');
  }
  const planned = session.activeEncounter.planned;

  const encounter = materializeCombatEncounter(
    planned,
    prototypeSquad,
    [prototypeWolf]
  );
  encounter.startingHealth = { ...session.squadHealth };
  encounter.maxRounds = 100;

  return {
    encounter,
    outcome: resolveCombat(encounter, planned.seed),
  };
}

export function getActiveEventModel(
  session: ExpeditionSession,
  eventRegistry: EventRegistry
): EventModel | undefined {
  return session.activeEncounter?.kind === 'event'
    ? eventRegistry.get(session.activeEncounter.modelId)
    : undefined;
}

export function resolveExpeditionEncounter(
  current: ExpeditionSession,
  action: ExpeditionAction,
  eventRegistry: EventRegistry
): ExpeditionSession {
  assertEncounterPhase(current);
  const session = cloneSession(current);
  const active = session.activeEncounter;

  if (!active) throw new Error('The expedition has no active encounter.');

  if (active.kind === 'combat') {
    if (action !== 'complete-combat') {
      throw new Error('Combat must be completed before the expedition advances.');
    }

    resolveCombatEncounter(session);
    return session;
  }

  resolveEventEncounter(session, active, action, eventRegistry);
  return session;
}

export function advanceExpedition(
  current: ExpeditionSession,
  eventRegistry: EventRegistry
): ExpeditionSession {
  if (current.phase !== 'summary') {
    throw new Error('The expedition can only advance from a summary.');
  }

  const session = cloneSession(current);
  delete session.summary;

  if (
    session.status !== 'active' ||
    session.currentIndex === session.plan.encounters.length - 1
  ) {
    if (session.status === 'active') session.status = 'success';
    session.phase = 'complete';
    return session;
  }

  session.currentIndex += 1;
  session.phase = 'encounter';
  return enterCurrentEncounter(session, eventRegistry);
}

export function getExpeditionRewards(
  session: ExpeditionSession
): ExpeditionRewards {
  if (session.phase !== 'complete') {
    throw new Error('Rewards are only available after an expedition ends.');
  }

  if (session.status === 'failure') {
    return { supplies: prototypeExpeditionRewards.failureSupplies, rare: [] };
  }

  return {
    supplies:
      prototypeExpeditionRewards.successSupplies + session.bonusSupplies,
    rare: [...session.rareRewards],
  };
}

function resolveCombatEncounter(session: ExpeditionSession): void {
  const { encounter, outcome } = createCurrentCombat(session);

  session.squadHealth = Object.fromEntries(
    outcome.squad.map((member) => [member.id, member.health])
  );

  if (outcome.result === 'stalemate') {
    throw new Error('Prototype combat reached its safety round limit.');
  }

  const defeated = outcome.result === 'defeat';
  if (defeated) session.status = 'failure';
  session.summary = {
    title: defeated ? 'Expedition Defeated' : 'Encounter Cleared',
    description: defeated
      ? `${encounter.name} overwhelmed the entire squad.`
      : `The squad defeated ${encounter.name} in ${outcome.rounds} rounds.`,
    details: healthDetails(outcome.squad),
  };
  finishEncounter(session);
}

function resolveEventEncounter(
  session: ExpeditionSession,
  active: Extract<ActiveEncounter, { kind: 'event' }>,
  action: ExpeditionAction,
  eventRegistry: EventRegistry
): void {
  const model = eventRegistry.get(active.modelId);
  const random = createSeededRandom(active.seed);
  const resolution = model.resolve(action, random);
  const effectState: EventEffectState = {
    squad: prototypeSquad,
    squadHealth: session.squadHealth,
    bonusSupplies: session.bonusSupplies,
    rareRewards: session.rareRewards,
  };
  const effectDetails = applyEventEffects(resolution.effects, effectState);

  session.bonusSupplies = effectState.bonusSupplies;
  session.summary = {
    title: resolution.title,
    description: resolution.description,
    details: [...(resolution.details ?? []), ...effectDetails],
  };
  if (!hasLivingSquad(session)) session.status = 'failure';
  finishEncounter(session);
}

function enterCurrentEncounter(
  session: ExpeditionSession,
  eventRegistry: EventRegistry
): ExpeditionSession {
  const planned = getCurrentEncounter(session);
  if (!planned) throw new Error('The expedition has no current encounter.');

  if (planned.kind === 'combat') {
    session.activeEncounter = { kind: 'combat', planned: { ...planned } };
    return session;
  }

  if (planned.kind === 'event') {
    session.activeEncounter = createActiveEvent(
      planned.eventPool,
      planned.seed,
      eventRegistry
    );
    return session;
  }

  const finalRandom = createSeededRandom(deriveSeed(planned.seed, 'final-roll'));
  if (finalRandom.next() < planned.rareEventChance) {
    session.activeEncounter = createActiveEvent(
      planned.rareEventPool,
      deriveSeed(planned.seed, 'rare-event'),
      eventRegistry
    );
    return session;
  }

  session.activeEncounter = {
    kind: 'combat',
    planned: {
      kind: 'combat',
      position: planned.position,
      seed: deriveSeed(planned.seed, 'combat'),
      combatNumber: planned.combatNumber,
      level: planned.level,
      difficulty: planned.difficulty,
    },
  };
  return session;
}

function createActiveEvent(
  pool: string,
  seed: number,
  eventRegistry: EventRegistry
): ActiveEncounter {
  const selectionRandom = createSeededRandom(deriveSeed(seed, 'event-selection'));
  const model = eventRegistry.select(pool, selectionRandom);
  return {
    kind: 'event',
    modelId: model.id,
    seed: deriveSeed(seed, 'event-resolution'),
  };
}

function healthDetails(squad: CombatOutcome['squad']): string[] {
  return squad.map(
    (member) => `${member.name}: ${member.health}/${member.maxHealth} HP`
  );
}

function hasLivingSquad(session: ExpeditionSession): boolean {
  return prototypeSquad.some(
    (member) => (session.squadHealth[member.id] ?? member.maxHealth) > 0
  );
}

function finishEncounter(session: ExpeditionSession): void {
  session.phase = 'summary';
}

function assertEncounterPhase(session: ExpeditionSession): void {
  if (session.phase !== 'encounter' || session.status !== 'active') {
    throw new Error('The expedition is not awaiting an encounter action.');
  }
}

function cloneSession(session: ExpeditionSession): ExpeditionSession {
  const clone: ExpeditionSession = {
    seed: session.seed,
    plan: {
      ...session.plan,
      encounters: session.plan.encounters.map((encounter) => ({ ...encounter })),
    },
    currentIndex: session.currentIndex,
    phase: session.phase,
    status: session.status,
    squadHealth: { ...session.squadHealth },
    bonusSupplies: session.bonusSupplies,
    rareRewards: [...session.rareRewards],
    activeEncounter:
      session.activeEncounter?.kind === 'combat'
        ? {
            kind: 'combat',
            planned: { ...session.activeEncounter.planned },
          }
        : session.activeEncounter
          ? { ...session.activeEncounter }
          : undefined,
  };

  if (session.summary) {
    clone.summary = {
      ...session.summary,
      details: [...session.summary.details],
    };
  }

  return clone;
}
