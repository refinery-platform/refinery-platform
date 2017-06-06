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
