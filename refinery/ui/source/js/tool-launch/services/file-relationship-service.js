(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .service('fileRelationshipService', fileRelationshipService);

  fileRelationshipService.$inject = ['_', 'fileBrowserFactory', 'toolsService'];

  function fileRelationshipService (_, fileBrowserFactory, toolsService) {
    var vm = this;
    vm.attributesObj = {};
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
    // convert attributes array to attributes obj
    function generateAttributeObj () {
      var attributeArr = fileBrowserFactory.assayAttributes;
      for (var i = 0; i < attributeArr.length; i ++) {
        vm.attributesObj[attributeArr[i].display_name] = attributeArr[i].internal_name;
      }
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
      generateAttributeObj();
      return vm.currentPosition;
    }
  }
})();
