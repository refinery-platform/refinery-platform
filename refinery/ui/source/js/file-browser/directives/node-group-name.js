'use strict';


function rpFileBrowserNodeGroupName (bootbox) {
  return {
    controller: 'NodeGroupCtrl',
    link: function (scope, element, attr, ctrl) {
      var msg = '<h3>Type a new group name.</h3>';
      element.bind('click', function () {
        bootbox.prompt(msg, function (name) {
          if (name) {
            ctrl.saveNodeGroup(name);
          }
        });
      });
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpFileBrowserNodeGroupName', [
    'bootbox',
    rpFileBrowserNodeGroupName
  ]);
