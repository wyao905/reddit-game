import { createSeededRandom, type RandomSource } from '../random.js';
import type {
  CombatLogEntry,
  CombatOutcome,
  CombatantDefinition,
  CombatantState,
  DamageType,
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
  const squad = encounter.squad.map((combatant) =>
    createState(combatant, encounter.startingHealth)
  );
  const enemies = encounter.enemies.map((combatant) =>
    createState(combatant, encounter.startingHealth)
  );
  const log: CombatLogEntry[] = [];
  const maxRounds = encounter.maxRounds ?? DEFAULT_MAX_ROUNDS;
  let completedRounds = 0;

  for (let round = 1; round <= maxRounds; round += 1) {
    completedRounds = round;
    const turnOrder = [...squad, ...enemies].sort(
      (left, right) => right.speed - left.speed
    );

    for (const actor of turnOrder) {
      if (!isAlive(actor)) continue;

      if (actor.side === 'squad') {
        if (!hasLiving(enemies)) break;
        actor.taunting = false;
        takeSquadTurn(actor, squad, enemies, round, random, log);
      } else {
        if (!hasLiving(squad)) break;
        takeEnemyTurn(actor, squad, round, random, log);
      }
    }

    if (!hasLiving(squad) || !hasLiving(enemies)) break;
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
      const healing = Math.max(
        1,
        Math.round(actor.magic * skill.healingMultiplier)
      );
      const amount = Math.min(healing, target.maxHealth - target.health);
      target.health += amount;
      log.push({
        round,
        actorId: actor.id,
        action: skill.name,
        targetIds: [target.id],
        effect: 'heal',
        amount,
        targetHealthAfter: target.health,
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
  const damageType =
    skill?.kind === 'damage' || skill?.kind === 'taunt'
      ? skill.damageType
      : actor.basicAttackType;

  if (skill?.kind === 'taunt') actor.taunting = true;
  dealDamage(
    actor,
    target,
    multiplier,
    damageType,
    round,
    action,
    random,
    log
  );
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
  dealDamage(
    actor,
    target,
    1,
    actor.basicAttackType,
    round,
    'Attack',
    random,
    log
  );
}

function dealDamage(
  actor: CombatantState,
  target: CombatantState,
  multiplier: number,
  damageType: DamageType,
  round: number,
  action: string,
  random: RandomSource,
  log: CombatLogEntry[]
): void {
  const variance = DAMAGE_VARIANCE_MIN + random.next() * DAMAGE_VARIANCE_RANGE;
  const power = damageType === 'physical' ? actor.attack : actor.magic;
  const mitigation =
    damageType === 'physical' ? target.defense : target.resistance;
  const rawDamage = power * multiplier * variance - mitigation * 0.5;
  const critical = random.next() < actor.criticalChance;
  const criticalMultiplier = critical ? actor.criticalDamage : 1;
  const amount = Math.max(1, Math.round(rawDamage * criticalMultiplier));
  target.health = Math.max(0, target.health - amount);

  log.push({
    round,
    actorId: actor.id,
    action,
    targetIds: [target.id],
    effect: 'damage',
    amount,
    damageType,
    critical,
    targetHealthAfter: target.health,
    message: `${actor.name} uses ${action} on ${target.name} for ${amount} ${damageType} damage${critical ? ' (critical)' : ''}.`,
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

function createState(
  definition: CombatantDefinition,
  startingHealth: Record<string, number> | undefined
): CombatantState {
  return {
    ...definition,
    health: startingHealth?.[definition.id] ?? definition.maxHealth,
    taunting: false,
  };
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
      combatant.defense < 0 ||
      combatant.magic < 0 ||
      combatant.resistance < 0 ||
      combatant.speed < 0 ||
      combatant.criticalChance < 0 ||
      combatant.criticalChance > 1 ||
      combatant.criticalDamage < 1
    ) {
      throw new Error(`Invalid combat stats for ${combatant.id}.`);
    }

    const startingHealth = encounter.startingHealth?.[combatant.id];
    if (
      startingHealth !== undefined &&
      (!Number.isFinite(startingHealth) ||
        startingHealth < 0 ||
        startingHealth > combatant.maxHealth)
    ) {
      throw new Error(`Invalid starting health for ${combatant.id}.`);
    }
  }
}
