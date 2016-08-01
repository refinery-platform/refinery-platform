'use strict';

function rpFileBrowserNodeGroup () {
  return {
    restrict: 'AE',
    templateUrl: '/static/partials/file-browser/partials/node-group.html',
    controller: 'NodeGroupCtrl',
    controllerAs: 'FBNGCtrl',
    bindToController: {
      nodeGroups: '=?'
    },
    link: function (scope, element, attrs, ctrl) {
      console.log('in the directive');
      ctrl.refreshNodeGroupList();
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpFileBrowserNodeGroup', [
    rpFileBrowserNodeGroup
  ]
);
