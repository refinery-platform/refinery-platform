'use strict';


function rpFileBrowserNodeGroupName (bootbox, $log) {
  return {
    controller: 'NodeGroupCtrl',
    link: function (scope, element, attr, ctrl) {
      var isUniqueName = function (name) {
        var flag = true;
        for (var i = 0; i < ctrl.nodeGroups.groups.length; i ++) {
          if (ctrl.nodeGroups.groups[i].name === name) {
            flag = false;
            break;
          }
        }
        return flag;
      };

      var msg = '<h3>Type a new group name.</h3>';
      element.bind('click', function () {
        bootbox.prompt(msg, function (name) {
          if (name && isUniqueName(name)) {
            ctrl.saveNodeGroup(name);
          } else {
            $log.error('Invalid name, either duplicate or null');
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
    '$log',
    rpFileBrowserNodeGroupName
  ]);
