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

    var service = {
      currentPosition: currentPosition,
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
      while (!_.isEmpty(scaledCopy.file_relationship) || fileDepth === 10) {
        fileDepth++;
        currentPosition.push(0);
        scaledCopy = scaledCopy.file_relationship[0].file_relationship;
      }

      return currentPosition;
    }
  }
})();
