(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .factory('toolLaunchService', toolLaunchService);

  toolLaunchService.$inject = [
    'fileRelationshipService',
    'toolSelectService',
    'toolsService',
    '_'
  ];

  function toolLaunchService (
    fileRelationshipService,
    toolSelectService,
    toolsService,
    _
  ) {
    var fileService = fileRelationshipService;
    var toolService = toolSelectService;
    var launchConfig = {};

    var service = {
      generateFileStr: generateFileStr,
      generateFileTemplate: generateFileTemplate,
      postToolLaunch: postToolLaunch
    };
    return service;

    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */

    function generateFileStr () {
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
      return fileRelationshipJson;
    }

    /**
     * Returns a str combination of () and []. It creates the max footprint
     * size based on the currentTypes and groupCollection.
     * Ex: currentTypes: ['PAIR', 'LIST', 'LIST'] groupCollection: {0,0,0:
      * {xx: [node1, node2, node3]}, 1,1,0: {xx2: node1}}
     * Returns ([[][][]], [[][][]])
     */
    function generateFileTemplate () {
      var footprint = '';
      // initialize the string object
      if (fileService.currentTypes[0] === 'PAIR') {
        footprint = '()';
      } else {
        footprint = '[]';
      }

      /** masterGroupArr tracks the max number of objs needed in the template.
       *  It is initialized to a zero array **/
      var masterGroupArr = _.fill(Array(fileService.currentTypes.length - 1), 0);
      angular.forEach(fileService.groupCollection, function (inputFileObj, groupId) {
        var groupList = groupId.split(',');
        for (var id = 0; id < groupList.length - 1; id++) {
          var groupInt = parseInt(groupList[id], 10);
          if (masterGroupArr[id] < groupInt) {
            masterGroupArr[id] = groupInt;
          }
        }
      });

      // create footprint based on the neighboring tool types structure
      for (var w = 1; w < fileService.currentTypes.length; w++) {
        if (fileService.currentTypes[w - 1] === 'PAIR' &&
          fileService.currentTypes[w] === 'PAIR') {
          footprint = insertSet(footprint, ['()', '()'], -1);
        } else if (fileService.currentTypes[w - 1] === 'PAIR' &&
          fileService.currentTypes[w] === 'LIST') {
          footprint = insertSet(footprint, ['()', '[]'], -1);
        } else if (fileService.currentTypes[w - 1] === 'LIST' &&
          fileService.currentTypes[w] === 'LIST') {
          footprint = insertSet(footprint, ['[]', '[]'], masterGroupArr[w - 1]);
        } else {
          footprint = insertSet(footprint, ['[]', '()'], masterGroupArr[w - 1]);
        }
      }
      return footprint;
    }

    // Main method to generate launch config
    function generateLaunchConfig () {
      launchConfig.tool_definition_uuid = toolService.selectedTool.uuid;
      launchConfig.file_relationships = JSON.stringify(generateFileStr());
    }

    /**
     * Custom helper method which inserts multiples of (), []
     * @param {string} fileTemplate - current footprint
     * @param {array} setType - contains neighboring type notation ex ['()','[]']
     * @param {maxNum} max number required for inserting sets
     */
    function insertSet (fileTemplate, setType, maxNum) {
      var searchLength = fileTemplate.length / 2;
      var pairIndex = 0;
      var tempFileTemplate = fileTemplate;

      for (var f = 0; f < searchLength; f++) {
        // grabs the index of the first holder set, ie LIST:PAIR, grabs
        // first empty list to insert the correct pair
        pairIndex = tempFileTemplate.indexOf(setType[0], pairIndex);
        // Used for pair:pair or pair:list -> 2 sets
        var insertStr = Array(3).join(setType[1]);
        if (maxNum > -1) {
          // For list:list or list:pair -> list of sets
          insertStr = Array(maxNum + 1 * 2).join(setType[1]);
        }
        // matches found then place insertStr into current tempFileTemplate
        if (pairIndex > -1) {
          tempFileTemplate = tempFileTemplate.slice(0, pairIndex + 1) + insertStr +
            tempFileTemplate.slice(pairIndex + 1);
        } else {
          break;
        }
        // increases the pair index for pair:pair or list:list
        if (setType[0] === setType[1]) {
          pairIndex = pairIndex + 4;
        }
      }
      return tempFileTemplate;
    }

    function postToolLaunch () {
      generateLaunchConfig();
      var tool = toolsService.save(launchConfig);
      return tool.$promise;
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
