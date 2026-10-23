import base from './playwright.config';
import { defineConfig } from '@playwright/test';

// Screenshot matrix for the polish pass (docs/polish/). Not part of the CI suite:
//   cd e2e && POLISH_OUT=../docs/polish/after npx playwright test -c polish.config.ts
export default defineConfig({
  ...base,
  testDir: './polish',
  testIgnore: [],
  retries: 0,
  reporter: 'line',
});
