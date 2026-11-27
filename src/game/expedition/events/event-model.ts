import type { RandomSource } from '../../random.js';
import type { EventEffect } from './effects.js';

export interface EventChoice {
  id: string;
  label: string;
  description: string;
}

export interface EventResolution {
  title: string;
  description: string;
  effects: EventEffect[];
  details?: string[];
}

export abstract class EventModel {
  abstract readonly id: string;
  abstract readonly pools: readonly string[];
  abstract readonly title: string;
  abstract readonly description: string;
  abstract readonly choices: readonly EventChoice[];

  abstract resolve(actionId: string, random: RandomSource): EventResolution;

  protected assertChoice(actionId: string): void {
    if (!this.choices.some((choice) => choice.id === actionId)) {
      throw new Error(`Action "${actionId}" is not valid for event "${this.id}".`);
    }
  }
}
