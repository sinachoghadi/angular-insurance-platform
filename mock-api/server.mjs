import { createServer } from 'node:http';
import { createApp } from './app.mjs';

const port = Number(process.env.PORT ?? 3000);
const sessionTtlMs = Number(process.env.SESSION_TTL_MS ?? 30 * 60 * 1000);
const latencyMs = Number(process.env.MOCK_LATENCY_MS ?? 400);

createServer(createApp({ sessionTtlMs, latencyMs })).listen(port, 'localhost', () => {
  console.log(`Mock API (development only) listening on http://localhost:${port}/api`);
  console.log(
    `Session lifetime: ${Math.round(sessionTtlMs / 1000)}s, simulated latency: ${latencyMs}ms`,
  );
});
