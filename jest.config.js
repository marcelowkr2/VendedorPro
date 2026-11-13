/** @type {import('jest').Config} */
const config = {
  testMatch: ['**/*.spec.ts', '**/*.spec.tsx'],
  testEnvironment: 'node',
  preset: 'ts-jest',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@vendedorpro/shared(.*)$': '<rootDir>/packages/shared/src$1',
    '^@vendedorpro/config(.*)$': '<rootDir>/packages/config/src$1',
    '^@vendedorpro/db(.*)$': '<rootDir>/packages/db/src$1',
  },
  collectCoverageFrom: [
    'packages/shared/src/**/*.ts',
    'apps/api/src/**/*.ts',
    'apps/web/src/**/*.tsx',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};

module.exports = config;