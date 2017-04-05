'use strict';
// Directive for creating new node groups.

function rpFileBrowserNodeGroupModal (
  $uibModal, $window
) {
  return {
    link: function (scope, element) {
      // New node group modal
      element.bind('click', function () {
        $uibModal.open({
          templateUrl: function () {
            return $window.getStaticUrl('partials/file-browser/partials/node-group-modal.html');
          },
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
    '$window',
    rpFileBrowserNodeGroupModal
  ]);
