import './index.css';

import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type {
  ApiErrorResponse,
  CombatantView,
  ExpeditionMemberView,
  ExpeditionView,
} from '../shared/api.js';

function App() {
  const [expedition, setExpedition] = useState<ExpeditionView>();
  const [visibleRounds, setVisibleRounds] = useState(0);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => { void loadCurrent(); }, []);

  async function loadCurrent(): Promise<void> {
    try {
      const response = await fetch('/api/expeditions/current', { method: 'POST' });
      if (response.status !== 404) setExpedition(await readExpedition(response));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setChecking(false);
    }
  }

  async function update(endpoint: string, body?: object): Promise<void> {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(
        endpoint,
        body
          ? {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(body),
            }
          : { method: 'POST' }
      );
      setExpedition(await readExpedition(response));
      setVisibleRounds(0);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  if (checking) return <Landing message="Checking for an active expedition…" />;
  if (!expedition) {
    return (
      <Landing
        message="Lead Mara, Oren, and Tavi through seven connected encounters. Health carries until the expedition ends."
        actionLabel={loading ? 'Preparing…' : 'Begin expedition'}
        onAction={() => update('/api/expeditions/start')}
        disabled={loading}
        error={error}
      />
    );
  }

  const stage = expedition.stage;
  const visibleHealth =
    stage.kind === 'combat'
      ? stage.combat.rounds[visibleRounds - 1]?.health
      : undefined;
  const displayedSquad = expedition.squad.map((member) => ({
    ...member,
    health: visibleHealth?.[member.id] ?? member.health,
  }));
  return (
    <main className="game-shell">
      <header>
        <div><p className="eyebrow">Active expedition</p><h1>Veiled Frontier</h1></div>
        <p className="round-counter">Encounter {expedition.position} / {expedition.encounterCount}</p>
      </header>

      <Progress expedition={expedition} />
      <Squad squad={displayedSquad} />

      {stage.kind === 'combat' && (
        <Combat
          expedition={expedition}
          visibleRounds={visibleRounds}
          setVisibleRounds={setVisibleRounds}
          loading={loading}
          finish={() => update('/api/expeditions/action', {
            position: expedition.position,
            action: 'complete-combat',
          })}
        />
      )}

      {stage.kind === 'event' && (
        <section className="story-card">
          <p className="eyebrow">Event</p><h2>{stage.title}</h2><p>{stage.description}</p>
          <div className="choice-list">
            {stage.options.map((option) => (
              <button key={option.action} disabled={loading} onClick={() =>
                update('/api/expeditions/action', {
                  position: expedition.position,
                  action: option.action,
                })
              }>
                <strong>{option.label}</strong><span>{option.description}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {stage.kind === 'summary' && (
        <section className="story-card summary-card">
          <p className="eyebrow">Encounter summary</p><h2>{stage.title}</h2><p>{stage.description}</p>
          <ul>{stage.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
          <button disabled={loading} onClick={() => update('/api/expeditions/advance', {
            position: expedition.position,
          })}>{loading ? 'Continuing…' : 'Continue'}</button>
        </section>
      )}

      {stage.kind === 'complete' && (
        <section className={`story-card result-${expedition.status}`}>
          <p className="eyebrow">Expedition complete</p>
          <h2>{expedition.status === 'success' ? 'The squad returned victorious' : 'The expedition was forced to retreat'}</h2>
          <p>Rewards earned: {stage.supplies} supplies</p>
          {stage.rareRewards.length > 0 && <p>Rare discoveries: {stage.rareRewards.join(', ')}</p>}
          {expedition.status === 'failure' && <p>Rare rewards were lost; 20% of basic supplies were recovered.</p>}
          <button disabled={loading} onClick={() => update('/api/expeditions/start')}>
            {loading ? 'Preparing…' : 'Start new expedition'}
          </button>
        </section>
      )}

      {error && <p className="error">{error}</p>}
    </main>
  );
}

function Landing(props: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
  error?: string | undefined;
}) {
  return (
    <main className="landing-shell"><section className="landing-card">
      <p className="eyebrow">Expedition prototype</p><h1>Veiled Frontier</h1><p>{props.message}</p>
      {props.actionLabel && <button onClick={props.onAction} disabled={props.disabled}>{props.actionLabel}</button>}
      {props.error && <p className="error">{props.error}</p>}
    </section></main>
  );
}

function Progress({ expedition }: { expedition: ExpeditionView }) {
  return (
    <div className="expedition-progress" aria-label="Expedition progress">
      {Array.from({ length: expedition.encounterCount }, (_, index) => (
        <span key={index} className={
          index + 1 < expedition.position ? 'completed' :
            index + 1 === expedition.position ? 'current' : ''
        }>{index + 1}</span>
      ))}
    </div>
  );
}

function Squad({ squad }: { squad: ExpeditionMemberView[] }) {
  return (
    <section className="squad-status"><h2>Expedition squad</h2><div className="combatant-list squad-list">
      {squad.map((member) => <Combatant key={member.id} combatant={member} health={member.health} />)}
    </div></section>
  );
}

function Combat(props: {
  expedition: ExpeditionView;
  visibleRounds: number;
  setVisibleRounds: React.Dispatch<React.SetStateAction<number>>;
  loading: boolean;
  finish: () => void;
}) {
  if (props.expedition.stage.kind !== 'combat') return null;
  const combat = props.expedition.stage.combat;
  const round = combat.rounds[props.visibleRounds - 1];
  const names = useMemo(
    () => Object.fromEntries(combat.combatants.map((unit) => [unit.id, unit.name])),
    [combat]
  );
  const finished = props.visibleRounds === combat.rounds.length;

  return (
    <section className="combat-stage">
      <div className="combat-heading">
        <div><p className="eyebrow">Combat</p><h2>{combat.name}</h2></div>
        <span>{props.visibleRounds === 0 ? 'Ready' : `Round ${props.visibleRounds} / ${combat.rounds.length}`}</span>
      </div>
      <section className="enemy-grid">
        {combat.combatants.filter((unit) => unit.side === 'enemy').map((enemy) => (
          <Combatant key={enemy.id} combatant={enemy} health={round?.health[enemy.id] ?? enemy.maxHealth} />
        ))}
      </section>
      <section className="combat-log" aria-live="polite">
        <h2>{props.visibleRounds === 0 ? 'Awaiting orders' : `Round ${props.visibleRounds}`}</h2>
        {props.visibleRounds === 0 ? <p>Begin combat to reveal each round.</p> : (
          <ol>{round?.actions.map((action, index) => (
            <li className={action.critical ? 'critical' : ''} key={`${action.actorId}-${index}`}>
              <span>{names[action.actorId]}</span> — {action.message}
            </li>
          ))}</ol>
        )}
      </section>
      <button className="advance-button" disabled={props.loading} onClick={
        finished ? props.finish : () => props.setVisibleRounds((value) => value + 1)
      }>
        {finished ? props.loading ? 'Recording outcome…' : 'Finish encounter' :
          props.visibleRounds === 0 ? 'Begin combat' : 'Next round'}
      </button>
    </section>
  );
}

function Combatant({ combatant, health }: { combatant: CombatantView; health: number }) {
  const percent = Math.max(0, Math.round((health / combatant.maxHealth) * 100));
  return (
    <article className={`combatant-card ${health === 0 ? 'downed' : ''}`}>
      <div className="combatant-heading"><strong>{combatant.name}</strong><span>{health}/{combatant.maxHealth} HP</span></div>
      <div className="health-track"><div className="health-fill" style={{ width: `${percent}%` }} /></div>
      <dl>
        <div><dt>ATK</dt><dd>{combatant.attack}</dd></div><div><dt>MAG</dt><dd>{combatant.magic}</dd></div>
        <div><dt>DEF</dt><dd>{combatant.defense}</dd></div><div><dt>RES</dt><dd>{combatant.resistance}</dd></div>
        <div><dt>SPD</dt><dd>{combatant.speed}</dd></div><div><dt>CRIT</dt><dd>{Math.round(combatant.criticalChance * 100)}%</dd></div>
      </dl>
    </article>
  );
}

async function readExpedition(response: Response): Promise<ExpeditionView> {
  const body = (await response.json()) as ExpeditionView | ApiErrorResponse;
  if (!response.ok || 'message' in body) throw new Error('message' in body ? body.message : 'Request failed.');
  return body;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to update the expedition.';
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
