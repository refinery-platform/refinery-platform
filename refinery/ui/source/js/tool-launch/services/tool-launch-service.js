/**
 * Tool Launch Service
 * @namespace toolLaunchService
 * @desc Service which preps and validates the parameters to launch a tool
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .factory('toolLaunchService', toolLaunchService);

  toolLaunchService.$inject = [
    'fileRelationshipService',
    'toolParamsService',
    'toolSelectService',
    'toolsService',
    '$window',
    '_'
  ];

  function toolLaunchService (
    fileRelationshipService,
    toolParamsService,
    toolSelectService,
    toolsService,
    $window,
    _
  ) {
    var fileService = fileRelationshipService;
    var paramsService = toolParamsService;
    var toolService = toolSelectService;
    var launchConfig = {};

    var service = {
      generateFileStr: generateFileStr,
      generateFileTemplate: generateFileTemplate,
      checkNeedMoreNodes: checkNeedMoreNodes,
      postToolLaunch: postToolLaunch
    };
    return service;

    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */
    /**
     * Returns the file relationship str, where the template includes
     * the node uuids and removes empty sets.
     * Ex: currentTypes: ['PAIR', 'LIST', 'LIST'] groupCollection: {0,0,0:
      * {xx: [node1, node2, node3]}, 1,1,0: {xx2: node1}}
     * Returns ([[node1][node2][node3]], [[node1]])
     */
    function generateFileStr () {
      // return the max template which is populated
      var fileTemplateStr = generateFileTemplate();

      // creates the uuid strs for each group
      // loops through each group
      angular.forEach(fileService.groupCollection, function (inputFileObj) {
        var uuidStr = '';
        // loops through each input file type (ex reverse vs forward), order
        // matters for back end so  used fileService.inputFileTypes array
        for (var fileInd = 0; fileInd < fileService.inputFileTypes.length; fileInd++) {
          var nodeArr = inputFileObj[fileService.inputFileTypes[fileInd].uuid];
          // loops through each node uuid and concats each string
          for (var nodeInd = 0; nodeInd < nodeArr.length; nodeInd++) {
            if (uuidStr.length === 0) {
              uuidStr = nodeArr[nodeInd].uuid;
            } else {
              uuidStr = uuidStr + ',' + nodeArr[nodeInd].uuid;
            }
          }
        }

        // inserts the uuidStrs into the templates
        var placeInd = 0;
        if (fileService.currentTypes[fileService.currentTypes.length - 1] === 'PAIR') {
          placeInd = fileTemplateStr.indexOf('()');
        } else if (fileService.currentTypes[fileService.currentTypes.length - 1] === 'LIST') {
          placeInd = fileTemplateStr.indexOf('[]');
        }
        var endPart = fileTemplateStr.slice(placeInd + 1);
        fileTemplateStr = fileTemplateStr.slice(0, placeInd + 1) + uuidStr + endPart;
      });

      // inserts commas between the ending sets, ex [(),(),()]
      fileTemplateStr = insertCommaBtwnSets(fileTemplateStr);

      return fileTemplateStr;
    }

    /**
     * Returns a str combination of () and []. It creates the footprint
     * size based on the currentTypes and groupCollection.
     * Ex: currentTypes: ['PAIR', 'LIST', 'LIST'] groupCollection: {0,0,0:
      * {xx: [node1, node2, node3]}, 1,1,0: {xx2: node1}}
     * Returns ([[][][]], [[]])
     */
    function generateFileTemplate () {
      var footprint = '';
      // initialize the string object
      if (fileService.currentTypes[0] === 'PAIR') {
        footprint = '()';
      } else {
        footprint = '[]';
      }

      // create footprint based on the neighboring tool types structure
      var groupIdList = _.keys(fileService.groupCollection);
      for (var f = 0; f < groupIdList.length; f++) {
        groupIdList[f] = angular.copy(groupIdList[f].split(','));
      }
      for (var typeInd = 1; typeInd < fileService.currentTypes.length; typeInd++) {
        var masterGroupArr = []; // generates # of sets to include for branches
        for (var groupInd = 0; groupInd < groupIdList.length; groupInd++) {
          if (typeInd === 1 || groupInd === groupIdList.length - 1) {
            // handles first pair group or last set of group Ids
            masterGroupArr.push(parseInt(groupIdList[groupInd][typeInd - 1], 10));
          } else if (isGroupBranched(groupIdList, groupInd, typeInd - 2)) {
            masterGroupArr.push(parseInt(groupIdList[groupInd][typeInd - 1], 10));
          }
        }

        // creates the correct str based on neighbor types and masterGroupArray
        if (fileService.currentTypes[typeInd - 1] === 'PAIR' &&
          fileService.currentTypes[typeInd] === 'PAIR') {
          footprint = insertSet(footprint, ['()', '()'], []);
        } else if (fileService.currentTypes[typeInd - 1] === 'PAIR' &&
          fileService.currentTypes[typeInd] === 'LIST') {
          footprint = insertSet(footprint, ['()', '[]'], []);
        } else if (fileService.currentTypes[typeInd - 1] === 'LIST' &&
          fileService.currentTypes[typeInd] === 'LIST') {
          footprint = insertSet(footprint, ['[]', '[]'], masterGroupArr);
        } else {
          footprint = insertSet(footprint, ['[]', '()'], masterGroupArr);
        }
      }

      return footprint;
    }

    // Method to generate launch config
    function generateLaunchConfig () {
      launchConfig.dataset_uuid = $window.dataSetUuid;
      launchConfig.tool_definition_uuid = toolService.selectedTool.uuid;
      launchConfig.file_relationships = generateFileStr();
      launchConfig.parameters = paramsService.paramsForm;
    }

    // helper method which inserts commas between sets )(,][,)[,](
    function insertCommaBtwnSets (setStr) {
      var endSetList = [')(', '][', ')[', ']('];
      var finalSetStr = setStr;

      for (var setInd = 0; setInd < endSetList.length; setInd++) {
        while (finalSetStr.indexOf(endSetList[setInd]) > -1) {
          var pairInd = finalSetStr.indexOf(endSetList[setInd]);
          finalSetStr = finalSetStr.slice(0, pairInd + 1) + ',' +
            finalSetStr.slice(pairInd + 1);
        }
      }
      return finalSetStr;
    }

    // helper method to check if each group-inputType are empty
    function areInputFileTypesEmpty () {
      var isEmpty = false;
      angular.forEach(fileService.groupCollection[fileService.currentGroup], function (inputList) {
        if (inputList.length === 0) {
          isEmpty = true;
        }
      });
      return isEmpty;
    }

    /**
     * Custom helper method which inserts multiples of (), []
     * @param {string} fileTemplate - current footprint
     * @param {array} setType - contains neighboring type notation ex ['()','[]']
     * @param {array} maxNumList - max number required for inserting sets
     */
    function insertSet (fileTemplate, setType, maxNumList) {
      var pairIndex = 0;
      var tempFileTemplate = fileTemplate;

      for (var tempInd = 0; tempInd < fileTemplate.length / 2; tempInd++) {
        // grabs the index of the first holder set, ie LIST:PAIR, grabs
        // first empty list to insert the correct pair
        pairIndex = tempFileTemplate.indexOf(setType[0], pairIndex);
        // matches found then place insertStr into current tempFileTemplate
        if (pairIndex > -1) {
          // Used for pair:pair or pair:list -> 2 sets
          var insertStr = Array(3).join(setType[1]);
            // For list:list or list:pair -> list of sets
          if (maxNumList.length > 0 && fileTemplate.length > 2 && tempInd < maxNumList.length) {
            insertStr = Array(maxNumList[tempInd] + 1 * 2).join(setType[1]);
          } else if (maxNumList.length !== 0) {
            // initializes or when groups don't branch
            var maxNum = _.max(maxNumList);  // grab largest set num
            insertStr = Array(maxNum + 1 * 2).join(setType[1]);
          }

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

    // helper method which distiguishes if groups are branched, ex [1,1,0,0]
    // branched from [1,2,0,0]
    function isGroupBranched (groupList, groupInd, maxIndex) {
      var branchFlag = false;
      for (var branchInd = 0; branchInd <= maxIndex; branchInd++) {
        if (groupList[groupInd][branchInd] !== groupList[groupInd + 1][branchInd]) {
          branchFlag = true;
          break;
        }
      }
      return branchFlag;
    }

    // View method to check if the group has minimum nodes
    function checkNeedMoreNodes () {
      var moreFlag = false;
      var groupType = fileService.currentTypes[fileService.currentTypes.length - 1];
      if (!_.property(fileService.currentGroup)(fileService.groupCollection)) {
        moreFlag = true;
      } else if (groupType === 'PAIR') {
        // pair, requires 2 inputTypes
        var inputLength = _.keys(fileService.groupCollection[fileService.currentGroup]).length;
        if (inputLength > 1) {
          moreFlag = areInputFileTypesEmpty();
        } else {
          moreFlag = true;
        }
      } else {
        // list
        moreFlag = areInputFileTypesEmpty();
      }
      return moreFlag;
    }

    /**
     * Main method to post a new tool job, calls on helper to generate
     * launch config.
     */
    function postToolLaunch () {
      generateLaunchConfig();
      var tool = toolsService.save(launchConfig);
      return tool.$promise;
    }
  }
})();
