// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000, // 60s per test
  use: {
    baseURL: 'http://localhost:5173',
    actionTimeout: 15000, // 15s for each action like click, fill
  },
  projects: [
    {
        name: 'setup',
        testMatch: /auth\.setup\.ts/,
    },
    {
        name: 'fitness-flows',
        testMatch: /fitness-flows\.spec\.ts/,
        dependencies: ['setup'], // runs auth.setup.ts first automatically
        use: {
        storageState: 'playwright/.auth/user.json', // uses saved session
        },
    },
    ],
  webServer: [
    {
      command: 'cd ../backend && node server.js', 
      url: 'http://localhost:5000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    }
  ],
});