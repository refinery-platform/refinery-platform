// Karma configuration
// Generated on Mon Jun 01 2015 13:25:59 GMT-0400 (EDT)

module.exports = function(config) {
  config.set({
    // Dont start a background tasks. We don't watch for changes in tests and
    // run them immediately
    background: false,

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: './',

    client: {
      // Set to `true` if `console.log()` should be captured.
      captureConsole: false
    },

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],


    // list of files / patterns to load in the browser
    files: [],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'source/**/*.html': 'ng-html2js',
      'source/**/!(*spec).js': 'coverage'
    },

    ngHtml2JsPreprocessor: {
      moduleName: 'refineryApp.templates',
      prependPrefix: '/static/partials/',
      stripPrefix: 'source/js/'
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['dots', 'coverage'],


    // Coverage repoter
    coverageReporter: {
      // common output directory
      dir : 'coverage/',
      reporters: [
        // reporters not supporting the `file` property
        { type: 'html', subdir: 'html' },
        { type: 'lcov', subdir: 'lcov' },
        // reporters supporting the `file` property, use `subdir` to directly
        // output them in the `dir` directory
        { type: 'cobertura', subdir: '.', file: 'cobertura.xml' },
      ]
    },


    // web server port
    port: 9999,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values:
    // - config.LOG_DISABLE
    // - config.LOG_ERROR
    // - config.LOG_WARN
    // - config.LOG_INFO
    // - config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // Which plugins to enable
    plugins: [
      'karma-coverage',
      'karma-phantomjs-launcher',
      'karma-jasmine',
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-safari-launcher',
      'karma-ng-html2js-preprocessor'
    ],

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['PhantomJS'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true
  });
};
