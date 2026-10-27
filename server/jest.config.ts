/** @type {import('ts-jest').JestConfigWithTsJest} **/

export default {
  preset: 'ts-jest',
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  transform: {
    "^.+.tsx?$": ["ts-jest",{ useESM: true }],
  },
  moduleNameMapper: {
    "^(\\.\\.?\\/.+)\\.js$": "$1",
  },
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: ["**/**/*.test.ts"],
  forceExit: true,
  verbose: true,
  collectCoverageFrom: ["src/{controllers,services,middlewares,validators}/**/*.ts"],
  coverageThreshold: {
    global: { statements: 95, branches: 95, functions: 95, lines: 95 },
  },

}