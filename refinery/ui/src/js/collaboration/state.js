angular
  .module('refineryCollaboration')
  .config([
    'refineryStateProvider',
    function (refineryStateProvider) {
      refineryStateProvider
        .state(
          'selectedGroup',
          {
            url: '/{uuid}/',
            templateUrl: '/static/partials/collaboration/partials/collaboration-main.html',
            controller: 'refineryCollaborationController as collab'
          },
          '/collaboration/')
        .state(
          'defaultGroup',
          {
            url: '/',
            templateUrl: '/static/partials/collaboration/partials/collaboration-main.html',
            controller: 'refineryCollaborationController as collab'
          },
          '/collaboration/'
        );
    }
  ]
);