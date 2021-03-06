/* eslint-env node */
/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/*.jest.ts'],
  // ignore .js extensions in import statements
  moduleNameMapper: {'(.+)\\.js': '$1'},
};
