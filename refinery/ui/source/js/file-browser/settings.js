(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .constant('fileBrowserSettings', {
      maxFileRequest: 100 // max number of files in API request
    });
})();
