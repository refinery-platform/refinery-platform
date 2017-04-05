'use strict';

function rpFileBrowserNodeGroup ($window) {
  return {
    restrict: 'AE',
    templateUrl: function () {
      return $window.getStaticUrl('partials/file-browser/partials/node-group.html');
    },
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
    '$window',
    rpFileBrowserNodeGroup
  ]
);
