module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/test/temp/',
    '/test/reports/'
  ],
  coverageDirectory: './reports/coverage',
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './reports/junit',
      outputName: 'results.xml'
    }]
  ],
  setupFiles: [
    './setup.js'
  ],
  testMatch: [
    '**/test/**/*.test.js',
    '**/test/**/*.spec.js'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../$1'
  }
};