'use strict';

function rpFileBrowserNodeGroup () {
  return {
    restrict: 'E',
    templateUrl: '/static/partials/file-browser/partials/node-group.html',
    controller: 'FileBrowserCtrl',
    controllerAs: 'FBNGCtrl',
    bindToController: {
      nodeGroupList: '@'
    },
    link: function (scope, element, attr, ctrl) {
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
