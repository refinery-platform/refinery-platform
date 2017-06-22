/**
 * Tool Type Icon Filter
 * @namespace toolTypeIcon
 * @desc Used by tool description and tool select to display correct icon
 * for workflow vs visualization
 * @memberOf refineryApp.refineryToolLaunch
 */
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
