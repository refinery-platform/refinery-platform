(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .service('fileRelationshipService', fileRelationshipService);

  fileRelationshipService.$inject = ['_', 'toolsService'];

  function fileRelationshipService (_, toolsService) {
    var vm = this;
    vm.fileDepth = 0; // Roots are at depth 0
    vm.currentPosition = [0];
    vm.currentTypes = []; // tracks whether depths are pair or list
    vm.inputFileTypes = []; // maintains the required input types
    vm.resetCurrents = resetCurrents;
    vm.refreshFileMap = refreshFileMap;

    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */
    function resetCurrents () {
      vm.fileDepth = 0;
      vm.currentPosition = [0];
      vm.currentTypes = [];
      vm.inputFileTypes = [];
    }

    // used to initialize the tool's data structure used by vm
    function refreshFileMap () {
      var scaledCopy = toolsService.selectedTool.file_relationship;
      // this is an array
      while (scaledCopy.file_relationship.length > 0 || vm.fileDepth === 10) {
        vm.fileDepth++;
        vm.currentPosition.push(0);
        vm.currentTypes.push(scaledCopy.value_type);
        scaledCopy = scaledCopy.file_relationship[0];
      }
      angular.copy(vm.inputFileTypes, scaledCopy.input_files);
      vm.currentTypes.push(scaledCopy.value_type);
      return vm.currentPosition;
    }
  }
})();
