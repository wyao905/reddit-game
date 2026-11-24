import { createSeededRandom, type RandomSource } from '../random.js';
import type {
  CombatLogEntry,
  CombatOutcome,
  CombatantDefinition,
  CombatantState,
  EncounterDefinition,
} from './types.js';

const DEFAULT_MAX_ROUNDS = 20;
const DAMAGE_VARIANCE_MIN = 0.9;
const DAMAGE_VARIANCE_RANGE = 0.2;

export function resolveCombat(
  encounter: EncounterDefinition,
  seed: number
): CombatOutcome {
  assertEncounter(encounter);

  const random = createSeededRandom(seed);
  const squad = encounter.squad.map(createState);
  const enemies = encounter.enemies.map(createState);
  const log: CombatLogEntry[] = [];
  const maxRounds = encounter.maxRounds ?? DEFAULT_MAX_ROUNDS;
  let completedRounds = 0;

  for (let round = 1; round <= maxRounds; round += 1) {
    completedRounds = round;
    clearTaunts(squad);

    for (const member of squad) {
      if (!isAlive(member) || !hasLiving(enemies)) continue;
      takeSquadTurn(member, squad, enemies, round, random, log);
    }

    if (!hasLiving(enemies)) break;

    for (const enemy of enemies) {
      if (!isAlive(enemy) || !hasLiving(squad)) continue;
      takeEnemyTurn(enemy, squad, round, random, log);
    }

    if (!hasLiving(squad)) break;
  }

  return {
    encounterId: encounter.id,
    result: hasLiving(enemies)
      ? hasLiving(squad)
        ? 'stalemate'
        : 'defeat'
      : 'victory',
    rounds: completedRounds,
    squad,
    enemies,
    log,
  };
}

function takeSquadTurn(
  actor: CombatantState,
  allies: CombatantState[],
  enemies: CombatantState[],
  round: number,
  random: RandomSource,
  log: CombatLogEntry[]
): void {
  const skill = actor.skill;

  if (skill?.kind === 'heal') {
    const target = mostInjured(allies);
    if (target && target.health < target.maxHealth) {
      const amount = Math.min(skill.healing, target.maxHealth - target.health);
      target.health += amount;
      log.push({
        round,
        actorId: actor.id,
        action: skill.name,
        targetIds: [target.id],
        amount,
        message: `${actor.name} uses ${skill.name}, restoring ${amount} health to ${target.name}.`,
      });
      return;
    }
  }

  const target = chooseLiving(enemies, random);
  const multiplier =
    skill?.kind === 'damage' || skill?.kind === 'taunt'
      ? skill.damageMultiplier
      : 1;
  const action =
    skill?.kind === 'damage' || skill?.kind === 'taunt'
      ? skill.name
      : 'Attack';

  if (skill?.kind === 'taunt') actor.taunting = true;
  dealDamage(actor, target, multiplier, round, action, random, log);
}

function takeEnemyTurn(
  actor: CombatantState,
  squad: CombatantState[],
  round: number,
  random: RandomSource,
  log: CombatLogEntry[]
): void {
  const taunting = squad.find((member) => isAlive(member) && member.taunting);
  const target = taunting ?? chooseLiving(squad, random);
  dealDamage(actor, target, 1, round, 'Attack', random, log);
}

function dealDamage(
  actor: CombatantState,
  target: CombatantState,
  multiplier: number,
  round: number,
  action: string,
  random: RandomSource,
  log: CombatLogEntry[]
): void {
  const variance = DAMAGE_VARIANCE_MIN + random.next() * DAMAGE_VARIANCE_RANGE;
  const rawDamage = actor.attack * multiplier * variance - target.defense * 0.5;
  const amount = Math.max(1, Math.round(rawDamage));
  target.health = Math.max(0, target.health - amount);

  log.push({
    round,
    actorId: actor.id,
    action,
    targetIds: [target.id],
    amount,
    message: `${actor.name} uses ${action} on ${target.name} for ${amount} damage.`,
  });
}

function mostInjured(combatants: CombatantState[]): CombatantState | undefined {
  return combatants
    .filter(isAlive)
    .sort(
      (left, right) =>
        left.health / left.maxHealth - right.health / right.maxHealth
    )[0];
}

function chooseLiving(
  combatants: CombatantState[],
  random: RandomSource
): CombatantState {
  const living = combatants.filter(isAlive);
  const index = Math.floor(random.next() * living.length);
  const selected = living[index];

  if (!selected) throw new Error('Cannot choose a target from an empty group.');
  return selected;
}

function createState(definition: CombatantDefinition): CombatantState {
  return { ...definition, health: definition.maxHealth, taunting: false };
}

function clearTaunts(squad: CombatantState[]): void {
  for (const member of squad) member.taunting = false;
}

function hasLiving(combatants: CombatantState[]): boolean {
  return combatants.some(isAlive);
}

function isAlive(combatant: CombatantState): boolean {
  return combatant.health > 0;
}

function assertEncounter(encounter: EncounterDefinition): void {
  if (encounter.squad.length === 0 || encounter.enemies.length === 0) {
    throw new Error('An encounter requires at least one squad member and enemy.');
  }

  for (const combatant of [...encounter.squad, ...encounter.enemies]) {
    if (
      combatant.maxHealth <= 0 ||
      combatant.attack < 0 ||
      combatant.defense < 0
    ) {
      throw new Error(`Invalid combat stats for ${combatant.id}.`);
    }
  }
}
