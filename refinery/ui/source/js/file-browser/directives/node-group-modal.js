'use strict';
// Directive for creating new node groups.

function rpFileBrowserNodeGroupModal (
  $uibModal
) {
  return {
    link: function (scope, element) {
      // New node group modal
      element.bind('click', function () {
        $uibModal.open({
          templateUrl: '/static/partials/file-browser/partials/node-group-modal.html',
          controller: 'NodeGroupModalCtrl',
          controllerAs: 'modal'
        });
      });
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpFileBrowserNodeGroupModal', [
    '$uibModal',
    rpFileBrowserNodeGroupModal
  ]);
