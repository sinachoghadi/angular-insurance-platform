import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { POLICIES } from './policies.mjs';

// One development server process owns the file. Commit to disk before publishing new state.
export function createPolicyRepository(filePath) {
  let records =
    filePath && existsSync(filePath)
      ? JSON.parse(readFileSync(filePath, 'utf8'))
      : structuredClone(POLICIES);
  if (!Array.isArray(records)) throw new Error('Invalid policy repository.');
  let queue = Promise.resolve();
  return {
    list: () => records,
    mutate(change) {
      const operation = queue.then(async () => {
        const next = structuredClone(records);
        const result = change(next);
        if (filePath) {
          await mkdir(dirname(filePath), { recursive: true });
          await writeFile(`${filePath}.tmp`, JSON.stringify(next), 'utf8');
          await rename(`${filePath}.tmp`, filePath);
        }
        records = next;
        return result;
      });
      queue = operation.catch(() => undefined);
      return operation;
    },
  };
}
