import { defineConfig } from '@playwright/test';

const PORT = 4190;

export default defineConfig({
  testDir: '.',
  // Software WebGL is slow, and several checks listen to a few seconds of audio.
  timeout: 180_000,
  expect: { timeout: 10_000 },
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 640, height: 360 },
    browserName: 'chromium',
    launchOptions: {
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--autoplay-policy=no-user-gesture-required',
      ],
    },
    trace: 'retain-on-failure',
  },
  // A test-mode build exposes the engine to the tests (see App.tsx); production builds don't.
  webServer: {
    cwd: '..',
    command: `npx vite build --mode test --outDir dist-test && npx vite preview --outDir dist-test --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
