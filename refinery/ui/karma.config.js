// Karma configuration
// Generated on Mon Jun 01 2015 13:25:59 GMT-0400 (EDT)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],


    // list of files / patterns to load in the browser
    files: [
      'bower_components/jquery/dist/jquery.js',
      'bower_components/angular/angular.js',
      'bower_components/angular-animate/angular-animate.js',
      'bower_components/angular-bootstrap/ui-bootstrap-tpls.js',
      'bower_components/angular-bootstrap/ui-bootstrap.js',
      'bower_components/angular-resource/angular-resource.js',
      'bower_components/angular-sanitize/angular-sanitize.js',
      'bower_components/angular-ui-router/release/angular-ui-router.js',
      'bower_components/angular-ui-select2/release/select2.min.js',
      'bower_components/angular-ui-scroll/dist/ui-scroll.min.js',
      'bower_components/lodash-3/lodash.js',
      './karma.lodash.noConflict.js',
      'bower_components/c3/c3.js',
      'bower_components/d3/d3.js',
      'bower_components/floatThead/dist/jquery.floatThead.js',
      'bower_components/humanize/humanize.js',
      'bower_components/jquery-file-upload/css/jquery.fileupload-ui.css',
      'bower_components/jquery-file-upload/css/jquery.fileupload.css',
      'bower_components/jquery-file-upload/js/jquery.fileupload-angular.js',
      'bower_components/jquery-file-upload/js/jquery.iframe-transport.js',
      'bower_components/jquery-file-upload/js/vendor/jquery.ui.widget.js',
      'bower_components/jquery-file-upload/js/jquery.fileupload.js',
      'bower_components/jquery-file-upload/js/jquery.fileupload-process.js',
      'bower_components/jquery-file-upload/js/jquery.fileupload-validate.js',
      'bower_components/ng-file-upload/angular-file-upload.js',
      'bower_components/ng-grid/build/ng-grid.js',
      'bower_components/spark-md5/spark-md5.js',
      'bower_components/spectrum/spectrum.js',
      'bower_components/tipsy/src/javascripts/jquery.tipsy.js',
      'bower_components/angular-mocks/angular-mocks.js',
      'source/js/refinery.js',
      'source/js/commons/router/module.js',
      'source/js/commons/router/*.js',
      'source/js/commons/filter/*.js',
      'source/js/commons/services/*.js',
      'source/js/commons/router/*.js',
      'source/js/**/**/*module.js',
      'source/js/**/*module.js',
      'source/js/**/**/state.js',
      'source/js/**/*state.js',
      'source/js/**/**/*url-router.js',
      'source/js/**/*ctrl.js',
      'source/js/**/*factory.js',
      'source/js/**/*.js',
      'source/js/**/**/*.js',
      'source/js/**/**/*spec.js',
      'source/js/**/*spec.js',
    ],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // Which plugins to enable
    plugins: [
      'karma-phantomjs-launcher',
      'karma-jasmine',
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-safari-launcher'
    ],

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['PhantomJS'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true
  });
};
