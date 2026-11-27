import type { RandomSource } from '../../random.js';
import { CampEvent } from './camp-event.js';
import type { EventModel } from './event-model.js';
import { RuinsEvent } from './ruins-event.js';
import { VeiledDiscoveryEvent } from './veiled-discovery-event.js';

export class EventRegistry {
  private readonly models: Map<string, EventModel>;

  constructor(models: readonly EventModel[]) {
    this.models = new Map(models.map((model) => [model.id, model]));
    if (this.models.size !== models.length) {
      throw new Error('Event model IDs must be unique.');
    }
  }

  get(modelId: string): EventModel {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Event model "${modelId}" is not registered.`);
    return model;
  }

  select(pool: string, random: RandomSource): EventModel {
    const eligible = [...this.models.values()].filter((model) =>
      model.pools.includes(pool)
    );
    if (eligible.length === 0) {
      throw new Error(`No event models are registered for pool "${pool}".`);
    }

    const selected = eligible[Math.floor(random.next() * eligible.length)];
    if (!selected) throw new Error('Failed to select an event model.');
    return selected;
  }
}

export const prototypeEventRegistry = new EventRegistry([
  new CampEvent(),
  new RuinsEvent(),
  new VeiledDiscoveryEvent(),
]);
