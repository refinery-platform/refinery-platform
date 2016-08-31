'use strict';

function rpFileBrowserNodeGroupSave () {
  return {
    restrict: 'AE',
    templateUrl: '/static/partials/file-browser/partials/node-group-save.html',
    controller: 'NodeGroupCtrl',
    controllerAs: 'NGCtrl',
    bindToController: {
      nodeGroups: '=?'
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpFileBrowserNodeGroupSave', [
    rpFileBrowserNodeGroupSave
  ]
);
