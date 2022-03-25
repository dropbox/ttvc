/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/*.jest.ts'],
  setupFilesAfterEnv: ['./test/jest.setup.js'],
  // ignore .js extensions in import statements
  moduleNameMapper: {'(.+)\\.js': '$1'},
};
