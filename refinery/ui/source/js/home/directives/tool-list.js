/**
 * Tool List Component
 * @namespace rpToolList
 * @desc Component to show a list of all the tools
 * @memberOf refineryApp.refineryHome
 */
(function () {
  'use strict';
  angular
    .module('refineryHome')
    .component('rpToolList', {
      controller: 'ToolListCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/home/partials/tool-list.html');
      }]
    });
})();
