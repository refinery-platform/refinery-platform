(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .filter('toolTypeIcon', function () {
      return function (param) {
        switch (param) {
          case 'VISUALIZATION':
            return 'fa fa-bar-chart';
          default: // Workflow
            return 'fa fa-cog';
        }
      };
    });
})();
