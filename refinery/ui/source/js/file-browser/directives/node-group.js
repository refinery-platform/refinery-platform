'use strict';

function rpFileBrowserNodeGroup () {
  return {
    restrict: 'E',
    templateUrl: '/static/partials/file-browser/partials/node-group.html',
    controller: 'NodeGroupCtrl',
    controllerAs: 'NGCtrl',
    bindToController: {
      nodeGroupList: '@'
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpFileBrowserNodeGroup', [
    rpFileBrowserNodeGroup
  ]
);
