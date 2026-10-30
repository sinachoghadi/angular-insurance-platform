import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { seedClaims } from './claims.mjs';
export function createClaimRepository(filePath, policies) {
  let data =
    filePath && existsSync(filePath)
      ? JSON.parse(readFileSync(filePath, 'utf8'))
      : seedClaims(policies);
  if (!data || !['claims', 'history', 'notes'].every((k) => Array.isArray(data[k])))
    throw new Error('Invalid claims repository.');
  let queue = Promise.resolve();
  return {
    read: () => data,
    mutate(change) {
      const operation = queue.then(async () => {
        const next = structuredClone(data);
        const result = change(next);
        if (filePath) {
          await mkdir(dirname(filePath), { recursive: true });
          await writeFile(`${filePath}.tmp`, JSON.stringify(next), 'utf8');
          await rename(`${filePath}.tmp`, filePath);
        }
        data = next;
        return result;
      });
      queue = operation.catch(() => undefined);
      return operation;
    },
  };
}
