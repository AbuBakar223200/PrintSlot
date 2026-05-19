module.exports = {
  preset: 'react-native',
  rootDir: '.',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testRegex: 'src[\\\\/].*__tests__[\\\\/].*\\.(test|spec)\\.(ts|tsx)$',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@printslot/shared$': '<rootDir>/../../packages/shared/src',
    '^@printslot/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|expo-.*|@unimodules/.*|@react-navigation/.*|react-native-reanimated)/)',
  ],
};
