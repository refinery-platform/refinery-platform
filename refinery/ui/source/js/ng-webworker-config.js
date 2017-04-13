'use strict';

angular
  .module('ngWebworker')
  .config(['WebworkerProvider', function (WebworkerProvider) {
    WebworkerProvider.setHelperPath(
      // if this line is removed getStaticUrl can be converted to a service
      window.getStaticUrl('vendor/ng-webworker/src/worker_wrapper.min.js')
    );

    // Do not use the helper by default. This will anyway be overwritten by the
    // plugin if the browser ID is MSIE.
    WebworkerProvider.setUseHelper(false);

    // Transfer ownership doesn't work with the worker_wrapper helper.
    WebworkerProvider.setTransferOwnership(true);
  }]);
