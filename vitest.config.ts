import { defineConfig } from 'vitest/config';

// Unit tests cover the pure logic modules (word matching, sync sharding)
// — no browser or chrome APIs involved, so plain Node environment is enough.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
});
