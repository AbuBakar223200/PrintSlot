module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: 'src/.*\\.spec\\.ts$',
  moduleNameMapper: {
    '^@printslot/shared$': '<rootDir>/../../packages/shared/src',
    '^@printslot/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
  },
};
