'use strict';

function rpFileBrowserSelectionReset () {
  return {
    restrict: 'AE',
    templateUrl: '/static/partials/file-browser/partials/selection-reset.html',
    controller: 'NodeGroupCtrl',
    controllerAs: 'NGCtrl',
    bindToController: {
      nodeGroups: '=?'
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpFileBrowserSelectionReset', [
    rpFileBrowserSelectionReset
  ]
);
