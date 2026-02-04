export default {
  // Use Node environment (Express, JWT, DB, etc.)
  testEnvironment: 'node',

  // ⬅️ CRITICAL: loads .env.test BEFORE any imports (ESM-safe)
  setupFiles: ['dotenv/config'],

  // Runs AFTER Jest environment is ready
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Needed for ESM + Jest
  transform: {},

  // Test file patterns
  testMatch: ['**/tests/**/*.test.js'],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'middleware/**/*.js',
    'routes/**/*.js',
    'utils/**/*.js',
    'server.js',
    '!db.js',
  ],

  coverageThreshold: {
    './utils/': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    './middleware/': {
      statements: 70,
      branches: 70,
      functions: 60,
      lines: 70,
    },
  },

  coverageReporters: ['text', 'lcov'],

  // Avoid open handles warnings
  forceExit: true,
};
