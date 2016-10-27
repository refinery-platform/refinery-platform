'use strict';

function rpFileBrowserNodeGroup () {
  return {
    restrict: 'AE',
    templateUrl: '/static/partials/file-browser/partials/node-group.html',
    controller: 'NodeGroupCtrl',
    controllerAs: 'FBNGCtrl',
    bindToController: {
      nodeGroups: '=?'
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpFileBrowserNodeGroup', [
    rpFileBrowserNodeGroup
  ]
);
