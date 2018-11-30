(function () {
  'use strict';
  angular
    .module('refineryDataSetNav')
    .component('rpMainNavBar', {
      controller: 'MainNavBarCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/data-set-nav/partials/main-nav-bar.html');
      }]
    });
})();
