import type { RandomSource } from '../../random.js';
import { GrantRareRewardEffect } from './effects.js';
import { EventModel, type EventResolution } from './event-model.js';

export class VeiledDiscoveryEvent extends EventModel {
  readonly id = 'veiled-discovery';
  readonly pools = ['rare'];
  readonly title = 'Something Beneath the Veil';
  readonly description =
    'An unfamiliar light flickers beyond the final trail. The squad approaches carefully.';
  readonly choices = [
    {
      id: 'claim-rare-event',
      label: 'Uncover the discovery',
      description: 'Investigate what has been hidden here.',
    },
  ];

  resolve(actionId: string, _random: RandomSource): EventResolution {
    this.assertChoice(actionId);
    return {
      title: 'A Veiled Discovery',
      description:
        'Beyond the final trail, the squad uncovers a relic hidden beneath unfamiliar markings.',
      effects: [new GrantRareRewardEffect('Veiled Relic')],
    };
  }
}
