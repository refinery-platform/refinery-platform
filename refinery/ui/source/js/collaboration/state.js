'use strict';

angular
  .module('refineryCollaboration')
  .config([
    'refineryStateProvider', '$windowProvider',
    function (refineryStateProvider, $windowProvider) {
      var $window = $windowProvider.$get();
      refineryStateProvider
        .state(
          'selectedGroup', {
            url: '/{uuid}/',
            templateUrl: function () {
              return $window.getStaticUrl('partials/collaboration/view/main.html');
            },
            controller: 'refineryCollaborationCtrl as collab'
          },
          '/collaboration/')
        .state(
          'defaultGroup', {
            url: '/',
            templateUrl: function () {
              return $window.getStaticUrl('partials/collaboration/view/main.html');
            },
            controller: 'refineryCollaborationCtrl as collab'
          },
          '/collaboration/'
      );
    }
  ]
);
