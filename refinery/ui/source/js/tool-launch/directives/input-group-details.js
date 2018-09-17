/**
 * Input Group Details Component
 * @namespace rpInputGroupDetails
 * @desc Component for the input files panel. Controls the input
 * group details which are displayed for pairs only
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';

  angular.module('refineryToolLaunch')
    .component('rpInputGroupDetails', {
      controller: 'InputGroupDetailsCtrl',
      require: {
        inputCtrl: '^rpInputGroup'
      },
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/tool-launch/partials/input-group-details.html');
      }]
    });
})();
