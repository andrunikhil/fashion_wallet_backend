module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@avatar/(.*)$': '<rootDir>/modules/avatar/$1',
    '^@catalog/(.*)$': '<rootDir>/modules/catalog/$1',
    '^@design/(.*)$': '<rootDir>/modules/design/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
  },
};
