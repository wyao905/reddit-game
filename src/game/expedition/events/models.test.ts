import { describe, expect, it } from 'vitest';
import { prototypeSquad } from '../../combat/fixtures.js';
import { CampEvent } from './camp-event.js';
import { applyEventEffects, type EventEffectState } from './effects.js';
import { EventRegistry } from './registry.js';
import { RuinsEvent } from './ruins-event.js';
import { VeiledDiscoveryEvent } from './veiled-discovery-event.js';

describe('event models', () => {
  it('keeps camp presentation and healing behavior inside the camp model', () => {
    const model = new CampEvent();
    const state = eventState({ mara: 0, oren: 10, tavi: 42 });
    const resolution = model.resolve('rest', { next: () => 0 });

    const details = applyEventEffects(resolution.effects, state);

    expect(model.title).toBe('Campfire Rest');
    expect(state.squadHealth).toEqual({ mara: 28, oren: 29, tavi: 42 });
    expect(details).toHaveLength(3);
  });

  it('lets the ruins model choose reward or damage effects at resolution time', () => {
    const model = new RuinsEvent();
    const rewardState = eventState();
    const damageState = eventState();

    applyEventEffects(
      model.resolve('investigate-ruins', { next: () => 0.1 }).effects,
      rewardState
    );
    applyEventEffects(
      model.resolve('investigate-ruins', { next: () => 0.9 }).effects,
      damageState
    );

    expect(rewardState.bonusSupplies).toBe(25);
    expect(damageState.squadHealth).toEqual({ mara: 48, oren: 32, tavi: 36 });
  });

  it('looks up and selects event models through a registry', () => {
    const camp = new CampEvent();
    const ruins = new RuinsEvent();
    const rare = new VeiledDiscoveryEvent();
    const registry = new EventRegistry([camp, ruins, rare]);

    expect(registry.get('camp')).toBe(camp);
    expect(registry.select('risk', { next: () => 0 })).toBe(ruins);
    expect(registry.select('rare', { next: () => 0 })).toBe(rare);
  });
});

function eventState(
  health: Record<string, number> = { mara: 56, oren: 38, tavi: 42 }
): EventEffectState {
  return {
    squad: prototypeSquad,
    squadHealth: { ...health },
    bonusSupplies: 0,
    rareRewards: [],
  };
}
