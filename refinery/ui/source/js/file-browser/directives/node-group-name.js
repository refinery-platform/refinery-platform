'use strict';
// Directive for creating new node groups.

function rpFileBrowserNodeGroupName (
  bootbox,
  $log,
  _,
  $window,
  fileBrowserFactory,
  selectedNodeGroupService,
  selectedNodesService) {
  return {

    link: function (scope, element) {
      var isUniqueName = function (name) {
        var flag = true;
        for (var i = 0; i < fileBrowserFactory.nodeGroupList.length; i ++) {
          if (fileBrowserFactory.nodeGroupList[i].name === name) {
            flag = false;
            break;
          }
        }
        return flag;
      };

      // Create a new node group
      var saveNodeGroup = function (name) {
        var params = selectedNodesService.getNodeGroupParams();
        params.name = name;
        var assayUuid = $window.externalAssayUuid;
        fileBrowserFactory.createNodeGroup(params).then(function () {
          // update node group list
          fileBrowserFactory.getNodeGroupList(assayUuid).then(function () {
            // Set the selected node group as the latest
            selectedNodeGroupService.setSelectedNodeGroup(_.last(fileBrowserFactory.nodeGroupList));
            // update selected node group uuid
            selectedNodesService.selectedNodeGroupUuid = selectedNodeGroupService
              .selectedNodeGroup.uuid;
          });
        });
      };

      var msg = '<h3>Type a new group name.</h3>';
      // New node group modal
      element.bind('click', function () {
        bootbox.prompt(msg, function (name) {
          if (name && isUniqueName(name)) {
            saveNodeGroup(name);
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
    '_',
    '$window',
    'fileBrowserFactory',
    'selectedNodeGroupService',
    'selectedNodesService',
    rpFileBrowserNodeGroupName
  ]);
