import express from 'express';
import type { UiResponse } from '@devvit/web/shared';
import {
  context,
  createServer,
  getServerPort,
  reddit,
  redis,
} from '@devvit/web/server';
import { randomInt } from 'node:crypto';
import {
  advanceExpedition,
  createPrototypeExpeditionSession,
  resolveExpeditionEncounter,
  type ExpeditionSession,
} from '../game/expedition/session.js';
import { prototypeEventRegistry } from '../game/expedition/events/registry.js';
import type {
  ApiErrorResponse,
  ExpeditionActionRequest,
  ExpeditionAdvanceRequest,
} from '../shared/api.js';
import { createPrototypeEncounterPreview } from './encounter-preview.js';
import { createExpeditionView } from './expedition-view.js';

const app = express();
app.use(express.json());

app.post('/api/encounters/preview', (_request, response) => {
  try {
    response.json(createPrototypeEncounterPreview(randomInt(0, 2 ** 31)));
  } catch (error) {
    console.error('Failed to create encounter preview:', error);
    response.status(500).json({
      message: 'Unable to start the encounter.',
    } satisfies ApiErrorResponse);
  }
});

app.post('/api/expeditions/current', async (_request, response) => {
  try {
    const session = await loadExpedition();
    if (!session) {
      response.status(404).json({ message: 'No expedition found.' });
      return;
    }

    response.json(createExpeditionView(session));
  } catch (error) {
    handleExpeditionError(response, error);
  }
});

app.post('/api/expeditions/start', async (_request, response) => {
  try {
    const session = createPrototypeExpeditionSession(
      randomInt(0, 2 ** 31),
      prototypeEventRegistry
    );
    await saveExpedition(session);
    response.json(createExpeditionView(session));
  } catch (error) {
    handleExpeditionError(response, error);
  }
});

app.post('/api/expeditions/action', async (request, response) => {
  try {
    const body = request.body as Partial<ExpeditionActionRequest>;
    const session = await requireExpeditionAtPosition(body.position);
    if (typeof body.action !== 'string') {
      throw new Error('An expedition action is required.');
    }

    const updated = resolveExpeditionEncounter(
      session,
      body.action,
      prototypeEventRegistry
    );
    await saveExpedition(updated);
    response.json(createExpeditionView(updated));
  } catch (error) {
    handleExpeditionError(response, error);
  }
});

app.post('/api/expeditions/advance', async (request, response) => {
  try {
    const body = request.body as Partial<ExpeditionAdvanceRequest>;
    const session = await requireExpeditionAtPosition(body.position);
    const updated = advanceExpedition(session, prototypeEventRegistry);
    await saveExpedition(updated);
    response.json(createExpeditionView(updated));
  } catch (error) {
    handleExpeditionError(response, error);
  }
});

app.post('/internal/menu/post-create', async (_request, response) => {
  try {
    const post = await reddit.submitCustomPost({
      title: 'Veiled Frontier — Expedition Prototype',
      entry: 'default',
    });

    response.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    } satisfies UiResponse);
  } catch (error) {
    console.error('Failed to create encounter post:', error);
    response.status(400).json({
      showToast: 'Failed to create encounter post',
    } satisfies UiResponse);
  }
});

async function loadExpedition(): Promise<ExpeditionSession | undefined> {
  const stored = await redis.get(expeditionKey());
  return stored ? (JSON.parse(stored) as ExpeditionSession) : undefined;
}

async function saveExpedition(session: ExpeditionSession): Promise<void> {
  await redis.set(expeditionKey(), JSON.stringify(session));
}

async function requireExpeditionAtPosition(
  position: number | undefined
): Promise<ExpeditionSession> {
  const session = await loadExpedition();
  if (!session) throw new Error('Start an expedition first.');
  if (position !== session.currentIndex + 1) {
    throw new Error('The expedition has already advanced. Refresh and try again.');
  }
  return session;
}

function expeditionKey(): string {
  if (!context.userId) throw new Error('Sign in to play an expedition.');
  return `expedition:active:${context.userId}`;
}

function handleExpeditionError(
  response: express.Response,
  error: unknown
): void {
  console.error('Expedition request failed:', error);
  response.status(400).json({
    message:
      error instanceof Error ? error.message : 'Unable to update the expedition.',
  } satisfies ApiErrorResponse);
}

app.use((_request, response) => {
  response.status(404).json({ message: 'Not found.' } satisfies ApiErrorResponse);
});

createServer(app).listen(getServerPort());
