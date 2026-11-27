import type { RandomSource } from '../../random.js';
import {
  DamageLivingPartyPercentEffect,
  GrantSuppliesEffect,
} from './effects.js';
import { EventModel, type EventResolution } from './event-model.js';

export class RuinsEvent extends EventModel {
  readonly id = 'ruins';
  readonly pools = ['risk'];
  readonly title = 'Ruins Off the Trail';
  readonly description =
    'Half-buried walls emerge from the mist. Searching them may uncover supplies—or danger.';
  readonly choices = [
    {
      id: 'investigate-ruins',
      label: 'Investigate the ruins',
      description:
        '50% chance to gain 25 supplies; otherwise each living member loses 15% max HP.',
    },
    {
      id: 'continue-onward',
      label: 'Continue onward',
      description: 'Avoid both the risk and the possible reward.',
    },
  ];

  resolve(actionId: string, random: RandomSource): EventResolution {
    this.assertChoice(actionId);

    if (actionId === 'continue-onward') {
      return {
        title: 'The Ruins Left Behind',
        description: 'The squad stays on the known trail and avoids the ruins.',
        effects: [],
        details: ['No health or rewards gained or lost.'],
      };
    }

    return random.next() < 0.5
      ? {
          title: 'Forgotten Supplies',
          description: 'The squad searches the ruins and finds a sealed cache.',
          effects: [new GrantSuppliesEffect(25)],
        }
      : {
          title: 'A Ruined Trap',
          description: 'The unstable floor gives way beneath the squad.',
          effects: [new DamageLivingPartyPercentEffect(0.15)],
        };
  }
}
