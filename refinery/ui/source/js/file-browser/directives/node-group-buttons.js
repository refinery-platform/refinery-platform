'use strict';

function rpFileBrowserNodeGroupButtons () {
  return {
    restrict: 'AE',
    templateUrl: '/static/partials/file-browser/partials/node-group-buttons.html',
    controller: 'NodeGroupCtrl',
    controllerAs: 'FBNGCtrl',
    bindToController: {
      nodeGroups: '=?'
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpFileBrowserNodeGroupButtons', [
    rpFileBrowserNodeGroupButtons
  ]
);
