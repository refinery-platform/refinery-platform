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
      generateFileTemplate: generateFileTemplate,
      postToolLaunch: postToolLaunch
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

    function generateFileTemplate () {
      var footprint = '';
      // initialize the string object
      if (fileService.currentTypes[0] === 'PAIR') {
        footprint = '()';
      } else {
        footprint = '[]';
      }

      // masterGroupArr tracks the # of objs needed in the template to fill
      // generate a zero array
      var masterGroupArr = Array.apply(null, { length: fileService.currentTypes.length - 1 })
        .map(function () { return 0; });

      angular.forEach(fileService.groupCollection, function (inputFileObj, groupId) {
        var groupList = groupId.split(',');
        for (var id = 0; id < groupList.length - 1; id++) {
          var groupInt = parseInt(groupList[id], 10);
          if (masterGroupArr[id] < groupInt) {
            masterGroupArr[id] = groupInt;
          }
        }
      });

      // create fileRelationshipJson footprint
      for (var w = 1; w < fileService.currentTypes.length; w++) {
        var searchLength = footprint.length;
        var pairIndex = 0;
        if (fileService.currentTypes[w - 1] === 'PAIR' &&
          fileService.currentTypes[w] === 'PAIR') {
          for (var f = 0; f < searchLength / 2; f++) {
            pairIndex = footprint.indexOf('()', pairIndex);
            if (pairIndex > -1) {
              footprint = footprint.slice(0, pairIndex + 1) + '()()' +
                footprint.slice(pairIndex + 1);
              pairIndex = pairIndex + 4;
            }
          }
        } else if (fileService.currentTypes[w - 1] === 'PAIR' &&
          fileService.currentTypes[w] === 'LIST') {
          for (var q = 0; q < searchLength / 2; q++) {
            pairIndex = footprint.indexOf('()', pairIndex);
            if (pairIndex > -1) {
              footprint = footprint.slice(0, pairIndex + 1) + '[][]' +
                footprint.slice(pairIndex + 1);
              pairIndex = pairIndex + 4;
            }
          }
        } else if (fileService.currentTypes[w - 1] === 'LIST' &&
          fileService.currentTypes[w] === 'LIST') {
          for (var p = 0; p < searchLength / 2; p++) {
            pairIndex = footprint.indexOf('[]', pairIndex);
            if (pairIndex > -1) {
              var listStr = Array(masterGroupArr[w - 1] + 1 * 2).join('[]');
              footprint = footprint.slice(0, pairIndex + 1) + listStr +
                footprint.slice(pairIndex + 1);
            }
          }
        } else {
          for (var n = 0; n < searchLength / 2; n++) {
            pairIndex = footprint.indexOf('[]', pairIndex);
            if (pairIndex > -1) {
              var pairStr = Array(masterGroupArr[w - 1] + 1 * 2).join('()');
              footprint = footprint.slice(0, pairIndex + 1) + pairStr +
                footprint.slice(pairIndex + 1);
            }
          }
        }
      }
      return footprint;
    }

    // Main method to generate launch config
    function generateLaunchConfig () {
      launchConfig.tool_definition_uuid = toolService.selectedTool.uuid;
      launchConfig.file_relationships = JSON.stringify(generateFileJson());
    }

    function generateFileJson () {
      var fileRelationshipJson = generateFileTemplate();

      // creates inner most string
      // sort and generate through by ordered keys
      angular.forEach(fileService.groupCollection, function (inputFileObj) {
        var uuidStr = '';
        var tempUuid = '';
        for (var m = 0; m < fileService.inputFileTypes.length; m++) {
          var nodeArr = inputFileObj[fileService.inputFileTypes[m].uuid];
          for (var j = 0; j < nodeArr.length; j++) {
            if (tempUuid.length === 0) {
              tempUuid = nodeArr[j].uuid;
            } else {
              tempUuid = tempUuid + ',' + nodeArr[j].uuid;
            }
          }
        }
        if (uuidStr.length > 0) {
          uuidStr = uuidStr + ',' + tempUuid;
        } else {
          uuidStr = tempUuid;
        }
        // initialize the final json object
        var placeInd = 0;
        if (fileService.currentTypes[fileService.currentTypes.length - 1] === 'PAIR') {
          placeInd = fileRelationshipJson.indexOf('()');
        } else if (fileService.currentTypes[fileService.currentTypes.length - 1] === 'LIST') {
          placeInd = fileRelationshipJson.indexOf('[]');
        }
        var endPart = fileRelationshipJson.slice(placeInd + 1);
        fileRelationshipJson = fileRelationshipJson.slice(0, placeInd + 1) + uuidStr + endPart;
      });

      // remove empty pairs and lists
      fileRelationshipJson = removeEmptySets(fileRelationshipJson);
      console.log('fileRelationship: ' + fileRelationshipJson);
      return fileRelationshipJson;
    }

    function removeEmptySets (setStr) {
      var cleanSetStr = setStr;
      while (cleanSetStr.indexOf('()') > -1) {
        var pairInd = cleanSetStr.indexOf('()');
        cleanSetStr = cleanSetStr.slice(0, pairInd) + cleanSetStr.slice(pairInd + 2);
      }
      while (cleanSetStr.indexOf('[]') > -1) {
        var listInd = cleanSetStr.indexOf('[]');
        cleanSetStr = cleanSetStr.slice(0, listInd) + cleanSetStr.slice(listInd + 2);
      }
      return cleanSetStr;
    }
  }
})();
