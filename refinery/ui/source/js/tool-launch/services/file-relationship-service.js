(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .factory('fileRelationshipService', fileRelationshipService);

  fileRelationshipService.$inject = ['_', 'toolsService'];

  function fileRelationshipService (_, toolsService) {
  //  var currentPosition = [];
    var fileDepth = 0; // Roots are at depth 0
    var currentPosition = [0];
    var currentTypes = [];

    var service = {
      currentPosition: currentPosition,
      currentTypes: currentTypes,
      refreshFileMap: refreshFileMap,
    };
    return service;

    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */
    function refreshFileMap () {
      var scaledCopy = toolsService.selectedTool.file_relationship;
      // this is an array
      while (scaledCopy.file_relationship.length > 0 || fileDepth === 10) {
        fileDepth++;
        currentPosition.push(0);
        currentTypes.push(scaledCopy.value_type);
        scaledCopy = scaledCopy.file_relationship[0];
      }
      currentTypes.push(scaledCopy.value_type);
      return currentPosition;
    }
  }
})();
