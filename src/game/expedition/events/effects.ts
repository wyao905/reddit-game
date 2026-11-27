import type { CombatantDefinition } from '../../combat/types.js';

export interface EventEffectState {
  squad: readonly CombatantDefinition[];
  squadHealth: Record<string, number>;
  bonusSupplies: number;
  rareRewards: string[];
}

export interface EventEffect {
  apply(state: EventEffectState): string[];
}

export class HealPartyPercentEffect implements EventEffect {
  constructor(
    private readonly percent: number,
    private readonly canRevive: boolean
  ) {}

  apply(state: EventEffectState): string[] {
    return state.squad.flatMap((member) => {
      const before = state.squadHealth[member.id] ?? member.maxHealth;
      if (before === 0 && !this.canRevive) return [];

      const healing = Math.round(member.maxHealth * this.percent);
      const after = Math.min(member.maxHealth, before + healing);
      state.squadHealth[member.id] = after;
      return [
        `${member.name} restored ${after - before} HP (${after}/${member.maxHealth}).`,
      ];
    });
  }
}

export class DamageLivingPartyPercentEffect implements EventEffect {
  constructor(private readonly percent: number) {}

  apply(state: EventEffectState): string[] {
    return state.squad.flatMap((member) => {
      const before = state.squadHealth[member.id] ?? member.maxHealth;
      if (before <= 0) return [];

      const damage = Math.max(1, Math.round(member.maxHealth * this.percent));
      const after = Math.max(0, before - damage);
      state.squadHealth[member.id] = after;
      return [
        `${member.name} lost ${before - after} HP (${after}/${member.maxHealth}).`,
      ];
    });
  }
}

export class GrantSuppliesEffect implements EventEffect {
  constructor(private readonly amount: number) {}

  apply(state: EventEffectState): string[] {
    state.bonusSupplies += this.amount;
    return [`Bonus reward pending: +${this.amount} supplies`];
  }
}

export class GrantRareRewardEffect implements EventEffect {
  constructor(private readonly reward: string) {}

  apply(state: EventEffectState): string[] {
    state.rareRewards.push(this.reward);
    return [`Rare reward secured: ${this.reward}`];
  }
}

export function applyEventEffects(
  effects: readonly EventEffect[],
  state: EventEffectState
): string[] {
  return effects.flatMap((effect) => effect.apply(state));
}
