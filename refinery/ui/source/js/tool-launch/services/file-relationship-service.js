(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .factory('fileRelationshipService', fileRelationshipService);

  fileRelationshipService.$inject = ['_', 'toolsService'];

  function fileRelationshipService (_, toolsService) {
    var fileDepth = 0; // Roots are at depth 0
    var currentPosition = [0];
    var currentTypes = []; // tracks whether depths are pair or list
    var inputFileTypes = []; // maintains the required input types

    var service = {
      currentPosition: currentPosition,
      currentTypes: currentTypes,
      refreshFileMap: refreshFileMap,
      resetCurrents: resetCurrents
    };
    return service;

    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */
    function resetCurrents () {
      fileDepth = 0;
      currentPosition = [0];
      currentTypes = [];
      inputFileTypes = [];
    }

    // used to initialize the tool's data structure used by vm
    function refreshFileMap () {
      var scaledCopy = toolsService.selectedTool.file_relationship;
      // this is an array
      while (scaledCopy.file_relationship.length > 0 || fileDepth === 10) {
        fileDepth++;
        currentPosition.push(0);
        currentTypes.push(scaledCopy.value_type);
        scaledCopy = scaledCopy.file_relationship[0];
      }
      angular.copy(inputFileTypes, scaledCopy.input_files);
      currentTypes.push(scaledCopy.value_type);
      return currentPosition;
    }
  }
})();
