'use strict';

function ClearFileInputCtrl ($element, $log, $rootScope, $timeout) {
  var self = this;

  $rootScope.$on('clearFileInput', function (event, name) {
    if (name === self.id) {
      try {
        $element[0].value = '';
        if ($element[0].value) {
          $element[0].type = 'text';
          $element[0].type = 'file';
        }
        if (typeof self.model !== 'undefined') {
          $timeout(function () {
            self.model = undefined;
          }, 0);
        }
      } catch (error) {
        $log.error(
          'Your Browser seems to be outdated. Clearing the file field is ' +
          'not supported.'
        );
      }
    }
  });
}

var clearFileInputDirective = function () {
  return {
    bindToController: {
      id: '@clearFileInput',
      model: '=clearFileInputModel'
    },
    controller: 'ClearFileInputCtrl',
    controllerAs: 'clearFileInput',
    restrict: 'A'
  };
};

angular
  .module('clearFileInput', [])
  .controller('ClearFileInputCtrl', [
    '$element',
    '$log',
    '$rootScope',
    '$timeout',
    ClearFileInputCtrl
  ])
  .directive('clearFileInput', ['$log', clearFileInputDirective]);
