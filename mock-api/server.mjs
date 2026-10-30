import { createServer } from 'node:http';
import { createApp } from './app.mjs';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT ?? 3000);
const sessionTtlMs = Number(process.env.SESSION_TTL_MS ?? 30 * 60 * 1000);
const latencyMs = Number(process.env.MOCK_LATENCY_MS ?? 400);

const policyFile = fileURLToPath(new URL('./.data/policies.json', import.meta.url));
const claimFile = fileURLToPath(new URL('./.data/claims.json', import.meta.url));
createServer(createApp({ sessionTtlMs, latencyMs, policyFile, claimFile })).listen(
  port,
  'localhost',
  () => {
    console.log(`Mock API (development only) listening on http://localhost:${port}/api`);
    console.log(
      `Session lifetime: ${Math.round(sessionTtlMs / 1000)}s, simulated latency: ${latencyMs}ms`,
    );
  },
);
