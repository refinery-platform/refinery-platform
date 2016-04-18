'use strict';

angular
  .module('ngWebworker')
  .config(function (WebworkerProvider) {
    WebworkerProvider.setHelperPath(
      '/static/vendor/ng-webworker/src/worker_wrapper.min.js'
    );
  }
);
