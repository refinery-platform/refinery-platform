'use strict';


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
          fileBrowserFactory.getNodeGroupList(assayUuid).then(function () {
            selectedNodeGroupService.setSelectedNodeGroup(_.last(fileBrowserFactory.nodeGroupList));
          });
        });
        console.log('complete save node group');
      };

      var msg = '<h3>Type a new group name.</h3>';
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
