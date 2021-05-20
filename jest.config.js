module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [ "**/__tests__/**/*.ts", "**/?(*.)+(test).ts" ],
  transform: {
      "^.+\\.(ts|tsx)$": "ts-jest"
}};
