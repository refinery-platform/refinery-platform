/**
 * Input Group Component
 * @namespace rpInputGroup
 * @desc Component for the input groups portion of the tool input control
 * panel
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';

  angular.module('refineryToolLaunch')
    .component('rpInputGroup', {
      controller: 'InputGroupCtrl',
      require: {
        displayCtrl: '^rpToolDisplay'
      },
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/tool-launch/partials/input-group.html');
      }]
    });
})();
