'use strict';

function rpFileBrowserNodeGroupButtons () {
  return {
    restrict: 'AE',
    templateUrl: '/static/partials/file-browser/partials/node-group-buttons.html',
    controller: 'NodeGroupCtrl',
    controllerAs: 'NGCtrl',
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
