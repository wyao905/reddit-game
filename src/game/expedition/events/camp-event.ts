import type { RandomSource } from '../../random.js';
import { HealPartyPercentEffect } from './effects.js';
import { EventModel, type EventResolution } from './event-model.js';

export class CampEvent extends EventModel {
  readonly id = 'camp';
  readonly pools = ['rest'];
  readonly title = 'Campfire Rest';
  readonly description =
    'The squad makes camp. Every member, including anyone downed, will recover 50% of maximum HP.';
  readonly choices = [
    {
      id: 'rest',
      label: 'Rest by the fire',
      description: 'Recover before continuing.',
    },
  ];

  resolve(actionId: string, _random: RandomSource): EventResolution {
    this.assertChoice(actionId);
    return {
      title: 'Campfire Rest',
      description:
        'The squad rests beside the fire and recovers 50% of each member\'s maximum health.',
      effects: [new HealPartyPercentEffect(0.5, true)],
    };
  }
}
