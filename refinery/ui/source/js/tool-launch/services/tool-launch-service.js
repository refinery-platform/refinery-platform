(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .factory('toolLaunchService', toolLaunchService);

  toolLaunchService.$inject = [
    'fileRelationshipService',
    'toolSelectService'
  ];

  function toolLaunchService (
    fileRelationshipService,
    toolSelectService
  ) {
    var fileService = fileRelationshipService;
    var toolService = toolSelectService;
    var launchConfig = {};

    var service = {
      generateLaunchConfig: generateLaunchConfig,
    };
    return service;

    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */

    function generateLaunchConfig () {
      // "file_relationship": {"file_relationship":
      // ['5c079f44-537a-478c-b358-553945a0ec18',
      // '8f3018dd-7ace-468e-bf0f-ca2e2932f0b0']},
      // "tool_definition_uuid": "bb88dab4-3f0b-48e2-bcd8-aef74d921c93"
      launchConfig.tool_definition_uuid = toolService.selectedTool.uuid;
      launchConfig.file_relationship = generateFileJson();
    }

    function generateFileJson () {
      var fileRelationshipJson = '';
      // currently only handles with innermost relationship
      var counter = 0;
      angular.forEach(fileService.groupCollection, function (inputFileObj, groupId) {
        console.log(groupId);
        var groupArr = groupId.split(',');
        // To Do: FIX GROUP IDs!!! ARGH!

        var uuidStr = '';
        // & for list
        // : for pairs
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
        console.log('uuidStr');
        console.log(uuidStr);
        console.log(groupId);
        // handles the inner most pair
        if (fileService.currentTypes[fileService.currentTypes.length - 1] === 'PAIR') {
          if (fileRelationshipJson === '') {
            fileRelationshipJson = '(' + uuidStr + ')';
          } else {
            uuidStr = ', (' + uuidStr + ')';
          }
        } else {
          if (fileRelationshipJson === '') {
            fileRelationshipJson = '[' + uuidStr + ']';
          } else {
            uuidStr = ', [' + uuidStr + ']';
          }
        }

        if (counter === 0) {
          // initialize the final json object
          for (var g = groupArr.length - 2; g >= 0; g--) {
            if (fileService.currentTypes[g] === 'PAIR') {
              fileRelationshipJson = '(' + fileRelationshipJson + ')';
            } else {
              fileRelationshipJson = '[' + fileRelationshipJson + ']';
            }
          }
        } else {
          console.log(fileRelationshipJson);
          // filter and place the other node strings
          var placeInd = 0;
          var pairCount = 0;
          var listCount = 0;
          for (var h = 0; h < fileService.currentTypes.length; h++) {
            if (fileService.currentTypes[h] === 'PAIR') {
              pairCount++;
              if (h === fileService.currentTypes.length - 1) {
                placeInd = fileRelationshipJson.indexOf('(', pairCount + parseInt(groupArr[h], 10));
              }
            } else {
              listCount++;
              if (h === fileService.currentTypes.length - 1) {
                placeInd = fileRelationshipJson.indexOf('[', listCount + parseInt(groupArr[h], 10));
              }
            }
          }

          console.log('placeInd: ', placeInd);
          console.log('part one: ' + fileRelationshipJson.slice(0, placeInd + 1));
          console.log('part uuid: ' + uuidStr);
          console.log('part three: ' + fileRelationshipJson.slice(placeInd + uuidStr.length));
          fileRelationshipJson = fileRelationshipJson.slice(0, placeInd + 1) +
            uuidStr + fileRelationshipJson.slice(placeInd + uuidStr.length);
        }
        counter++;
      });

      for (var n = 0; n < fileService.currentTypes.length - 1; n ++) {
        if (fileService.currentTypes[n] === 'PAIR') {
          fileRelationshipJson = '(' + fileRelationshipJson + ')';
        } else {
          fileRelationshipJson = '[' + fileRelationshipJson + ']';
        }
      }
      console.log(fileRelationshipJson);
      return fileRelationshipJson;
    }
  }
})();
