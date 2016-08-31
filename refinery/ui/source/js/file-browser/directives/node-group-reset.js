'use strict';

function rpFileBrowserNodeGroupReset () {
  return {
    restrict: 'AE',
    templateUrl: '/static/partials/file-browser/partials/node-group-reset.html',
    controller: 'NodeGroupCtrl',
    controllerAs: 'NGCtrl',
    bindToController: {
      nodeGroups: '=?'
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpFileBrowserNodeGroupReset', [
    rpFileBrowserNodeGroupReset
  ]
);
