import { describe, expect, it } from 'vitest';
import { prototypeEventRegistry } from './events/registry.js';
import {
  advanceExpedition,
  createPrototypeExpeditionSession,
  getExpeditionRewards,
  resolveExpeditionEncounter,
  type ExpeditionAction,
  type ExpeditionSession,
} from './session.js';

describe('prototype expedition session', () => {
  it('starts seven encounters with every squad member at full health', () => {
    const session = createPrototypeExpeditionSession(
      12_345,
      prototypeEventRegistry
    );

    expect(session.plan.encounters).toHaveLength(7);
    expect(
      session.plan.encounters.filter((encounter) => encounter.kind === 'event')
    ).toHaveLength(2);
    expect(session.squadHealth).toEqual({ mara: 56, oren: 38, tavi: 42 });
  });

  it('uses the second normal event as a camp that revives and heals the squad', () => {
    const session = createPrototypeExpeditionSession(321, prototypeEventRegistry);
    session.activeEncounter = { kind: 'event', modelId: 'camp', seed: 11 };
    session.squadHealth = { mara: 0, oren: 10, tavi: 42 };

    const rested = resolveExpeditionEncounter(
      session,
      'rest',
      prototypeEventRegistry
    );

    expect(rested.squadHealth).toEqual({ mara: 28, oren: 29, tavi: 42 });
    expect(rested.phase).toBe('summary');
    expect(rested.summary?.title).toBe('Campfire Rest');
  });

  it('supports both seeded outcomes when investigating the ruins', () => {
    const outcomes = new Set<string>();

    for (let seed = 0; seed < 100 && outcomes.size < 2; seed += 1) {
      const session = createPrototypeExpeditionSession(
        seed,
        prototypeEventRegistry
      );
      session.activeEncounter = { kind: 'event', modelId: 'ruins', seed };
      const resolved = resolveExpeditionEncounter(
        session,
        'investigate-ruins',
        prototypeEventRegistry
      );
      outcomes.add(resolved.bonusSupplies > 0 ? 'reward' : 'damage');
    }

    expect(outcomes).toEqual(new Set(['reward', 'damage']));
  });

  it('rolls the final rare event only when the final slot is entered', () => {
    const rare = prepareFinalSlot(1, 1);
    const combat = prepareFinalSlot(1, 0);

    const enteredRare = advanceExpedition(rare, prototypeEventRegistry);
    const enteredCombat = advanceExpedition(combat, prototypeEventRegistry);

    expect(enteredRare.activeEncounter).toMatchObject({
      kind: 'event',
      modelId: 'veiled-discovery',
    });
    expect(enteredCombat.activeEncounter?.kind).toBe('combat');
  });

  it('can play a complete expedition through the same state transitions as the UI', () => {
    let completed: ExpeditionSession | undefined;

    for (let seed = 0; seed < 100 && !completed; seed += 1) {
      let session = createPrototypeExpeditionSession(seed, prototypeEventRegistry);

      while (session.phase !== 'complete') {
        if (session.phase === 'summary') {
          session = advanceExpedition(session, prototypeEventRegistry);
          continue;
        }

        session = resolveExpeditionEncounter(
          session,
          actionFor(session),
          prototypeEventRegistry
        );
      }

      if (session.status === 'success') completed = session;
    }

    expect(completed?.status).toBe('success');
    expect(completed && getExpeditionRewards(completed).supplies).toBeGreaterThanOrEqual(100);
  });

  it('keeps only 20% of basic rewards after failure and discards rare rewards', () => {
    const session = createPrototypeExpeditionSession(1, prototypeEventRegistry);
    session.phase = 'complete';
    session.status = 'failure';
    session.bonusSupplies = 25;
    session.rareRewards = ['Veiled Relic'];

    expect(getExpeditionRewards(session)).toEqual({ supplies: 20, rare: [] });
  });
});

function actionFor(session: ExpeditionSession): ExpeditionAction {
  const active = session.activeEncounter;
  if (!active) throw new Error('Missing encounter.');
  if (active.kind === 'combat') return 'complete-combat';
  if (active.modelId === 'veiled-discovery') return 'claim-rare-event';
  return active.modelId === 'ruins' ? 'continue-onward' : 'rest';
}

function prepareFinalSlot(
  seed: number,
  rareEventChance: number
): ExpeditionSession {
  const session = createPrototypeExpeditionSession(seed, prototypeEventRegistry);
  const final = session.plan.encounters.at(-1);
  if (final?.kind !== 'final') throw new Error('Missing final slot.');
  final.rareEventChance = rareEventChance;
  session.currentIndex = session.plan.encounters.length - 2;
  session.phase = 'summary';
  return session;
}
