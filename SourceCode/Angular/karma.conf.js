module.exports = function (config) {
  const workspaceRootRequire = require('node:module').createRequire(process.cwd() + '/');
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: ['karma-jasmine', 'karma-chrome-launcher', 'karma-jasmine-html-reporter', 'karma-coverage'].map((p) => workspaceRootRequire(p)),
    jasmineHtmlReporter: { suppressAll: true },
    coverageReporter: { dir: 'coverage', subdir: '.', reporters: [{ type: 'html' }, { type: 'text-summary' }] },
    reporters: ['progress', 'kjhtml'],
    browsers: ['ChromeHeadlessNoSandbox'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--headless', '--disable-gpu', '--disable-dev-shm-usage'],
      },
    },
    browserNoActivityTimeout: 300000,
    browserDisconnectTimeout: 120000,
    browserDisconnectTolerance: 4,
    captureTimeout: 120000,
    restartOnFileChange: true,
    singleRun: true,
  });
};