'use strict';

function rpFileBrowserSelectionReset () {
  return {
    restrict: 'AE',
    templateUrl: '/static/partials/file-browser/partials/selection-reset.html',
    controller: 'NodeGroupCtrl',
    controllerAs: 'FBNGCtrl',
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
