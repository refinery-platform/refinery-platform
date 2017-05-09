(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .factory('toolLaunchService', toolLaunchService);

  toolLaunchService.$inject = [
    'fileRelationshipService',
    'toolSelectService',
    'toolsService'
  ];

  function toolLaunchService (
    fileRelationshipService,
    toolSelectService,
    toolsService
  ) {
    var fileService = fileRelationshipService;
    var toolService = toolSelectService;
    var launchConfig = {};

    var service = {
      postToolLaunch: postToolLaunch,
    };
    return service;

    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */

    function postToolLaunch () {
      generateLaunchConfig();
      var tool = toolsService.save(launchConfig);
      return tool.$promise;
    }

    function generateLaunchConfig () {
      launchConfig.tool_definition_uuid = toolService.selectedTool.uuid;
      launchConfig.file_relationships = JSON.stringify(generateFileJson());
    }

    function generateFileJson () {
      var fileRelationshipJson = '';
      // currently only handles with innermost relationship

      angular.forEach(fileService.groupCollection, function (inputFileObj) {
      //  var groupArr = groupId.split(',');
        var uuidStr = '';
        for (var m = 0; m < fileService.inputFileTypes.length; m++) {
          var nodeArr = inputFileObj[fileService.inputFileTypes[m].uuid];
          for (var j = 0; j < nodeArr.length; j++) {
            if (uuidStr.length === 0) {
              uuidStr = nodeArr[j].uuid;
            } else {
              uuidStr = uuidStr + ',' + nodeArr[j].uuid;
            }
          }
        }
        // handles the inner most object
        if (fileService.currentTypes[fileService.currentTypes.length - 1] === 'PAIR') {
          if (fileRelationshipJson === '') {
            fileRelationshipJson = '(' + uuidStr + ')';
          } else {
            uuidStr = '(' + uuidStr + ')';
          }
        } else {
          if (fileRelationshipJson === '') {
            fileRelationshipJson = '[' + uuidStr + ']';
          } else {
            uuidStr = '[' + uuidStr + ']';
          }
        }

        // if (counter === 0) {
        //  // initialize the final json object
        //  for (var g = groupArr.length - 2; g >= 0; g--) {
        //    if (fileService.currentTypes[g] === 'PAIR') {
        //      fileRelationshipJson = '(' + fileRelationshipJson + ')';
        //    } else {
        //      fileRelationshipJson = '[' + fileRelationshipJson + ']';
        //    }
        //  }
        // } else {
        //  // filter and place the other node strings
        //  var placeInd = 0;
        //  var pairCount = 0;
        //  var listCount = 0;
        //  for (var h = 0; h < fileService.currentTypes.length; h++) {
        //    if (fileService.currentTypes[h] === 'PAIR') {
        //      if (fileService.currentTypes[h] > 0) {
        //        var total = pairCount + parseInt(groupArr[h - 1], 10);
        //        for (var pl = 0; pl < total; pl++) {
        //          placeInd = fileRelationshipJson.indexOf(')', placeInd + 1);
        //        }
        //      }
        //      pairCount++;
        //    } else {
        //      if (fileService.currentTypes[h] > 0) {
        //        var total2 = listCount + parseInt(groupArr[h - 1], 10);
        //        for (var pl2 = 0; pl2 < total2; pl2++) {
        //          placeInd = fileRelationshipJson.indexOf(')', placeInd + 1);
        //        }
        //      }
        //      listCount++;
        //    }
        //  }

          // var endPart = fileRelationshipJson.slice(placeInd);
          // fileRelationshipJson = fileRelationshipJson.slice(0, placeInd) +
          //  uuidStr + fileRelationshipJson.slice(placeInd + uuidStr.length) + endPart;
      //  }
      //  counter++;
      });
      console.log(fileRelationshipJson);
      return fileRelationshipJson;
    }
  }
})();
