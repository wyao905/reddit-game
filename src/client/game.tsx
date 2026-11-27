import './index.css';

import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type {
  ApiErrorResponse,
  CombatantView,
  EncounterPreviewResponse,
} from '../shared/api.js';

function App() {
  const [encounter, setEncounter] = useState<EncounterPreviewResponse>();
  const [visibleRounds, setVisibleRounds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const currentRound = encounter?.rounds[visibleRounds - 1];
  const namesById = useMemo(
    () =>
      Object.fromEntries(
        encounter?.combatants.map((combatant) => [combatant.id, combatant.name]) ?? []
      ),
    [encounter]
  );

  async function startEncounter(): Promise<void> {
    setLoading(true);
    setError(undefined);

    try {
      const response = await fetch('/api/encounters/preview', { method: 'POST' });
      const body = (await response.json()) as
        | EncounterPreviewResponse
        | ApiErrorResponse;

      if (!response.ok || 'message' in body) {
        throw new Error('message' in body ? body.message : 'Request failed.');
      }

      setEncounter(body);
      setVisibleRounds(0);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to start the encounter.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (!encounter) {
    return (
      <main className="landing-shell">
        <section className="landing-card">
          <p className="eyebrow">Combat prototype</p>
          <h1>Veiled Frontier</h1>
          <p>
            Lead Mara, Oren, and Tavi through an encounter against three
            grey wolves.
          </p>
          <button onClick={startEncounter} disabled={loading}>
            {loading ? 'Preparing…' : 'Start encounter'}
          </button>
          {error && <p className="error">{error}</p>}
        </section>
      </main>
    );
  }

  const finished = visibleRounds === encounter.rounds.length;

  return (
    <main className="game-shell">
      <header>
        <div>
          <p className="eyebrow">Combat encounter</p>
          <h1>{encounter.name}</h1>
        </div>
        <p className="round-counter">
          {visibleRounds === 0
            ? 'Ready'
            : `Round ${visibleRounds} / ${encounter.rounds.length}`}
        </p>
      </header>

      <section className="battlefield">
        <CombatGroup
          title="Expedition squad"
          combatants={encounter.combatants.filter(
            (combatant) => combatant.side === 'squad'
          )}
          health={currentRound?.health}
        />
        <div className="versus">VS</div>
        <CombatGroup
          title="Enemies"
          combatants={encounter.combatants.filter(
            (combatant) => combatant.side === 'enemy'
          )}
          health={currentRound?.health}
        />
      </section>

      <section className="combat-log" aria-live="polite">
        <h2>{visibleRounds === 0 ? 'Awaiting orders' : `Round ${visibleRounds}`}</h2>
        {visibleRounds === 0 ? (
          <p>Advance the encounter to reveal the first round.</p>
        ) : (
          <ol>
            {currentRound?.actions.map((action, index) => (
              <li className={action.critical ? 'critical' : ''} key={`${action.actorId}-${index}`}>
                <span>{namesById[action.actorId]}</span> — {action.message}
              </li>
            ))}
          </ol>
        )}
      </section>

      {finished ? (
        <section className={`result result-${encounter.result}`}>
          <strong>{encounter.result.toUpperCase()}</strong>
          <div className="button-row">
            <button onClick={() => setVisibleRounds(0)}>Replay</button>
            <button onClick={startEncounter} disabled={loading}>
              {loading ? 'Preparing…' : 'New encounter'}
            </button>
          </div>
        </section>
      ) : (
        <button
          className="advance-button"
          onClick={() => setVisibleRounds((round) => round + 1)}
        >
          {visibleRounds === 0 ? 'Begin combat' : 'Next round'}
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </main>
  );
}

function CombatGroup({
  title,
  combatants,
  health,
}: {
  title: string;
  combatants: CombatantView[];
  health: Record<string, number> | undefined;
}) {
  return (
    <section className="combat-group">
      <h2>{title}</h2>
      <div className="combatant-list">
        {combatants.map((combatant) => {
          const currentHealth = health?.[combatant.id] ?? combatant.maxHealth;
          const healthPercent = Math.max(
            0,
            Math.round((currentHealth / combatant.maxHealth) * 100)
          );

          return (
            <article className="combatant-card" key={combatant.id}>
              <div className="combatant-heading">
                <strong>{combatant.name}</strong>
                <span>
                  {currentHealth}/{combatant.maxHealth} HP
                </span>
              </div>
              <div className="health-track">
                <div className="health-fill" style={{ width: `${healthPercent}%` }} />
              </div>
              <dl>
                <div><dt>ATK</dt><dd>{combatant.attack}</dd></div>
                <div><dt>MAG</dt><dd>{combatant.magic}</dd></div>
                <div><dt>DEF</dt><dd>{combatant.defense}</dd></div>
                <div><dt>RES</dt><dd>{combatant.resistance}</dd></div>
                <div><dt>SPD</dt><dd>{combatant.speed}</dd></div>
                <div><dt>CRIT</dt><dd>{Math.round(combatant.criticalChance * 100)}%</dd></div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
