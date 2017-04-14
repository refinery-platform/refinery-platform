(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('InputGroupCtrl', InputGroupCtrl);

  InputGroupCtrl.$inject = [
    '$scope',
    '_',
    'fileRelationshipService'
  ];


  function InputGroupCtrl (
    $scope,
    _,
    fileRelationshipService
  ) {
    var fileService = fileRelationshipService;
    var vm = this;
    vm.attributes = fileService.attributesObj;
    vm.currentFileInput = [];
    vm.isNavCollapsed = false;
    vm.isGroupPopulated = isGroupPopulated;
    vm.inputFilesTypes = fileService.inputFileTypes;
    vm.groupCollection = fileService.groupCollection;
    vm.currentGroup = fileService.currentGroup;
    vm.tool = {}; // selected tool displayed in panel
    vm.toolType = ''; // workflow vs visualization


   /*
   * ---------------------------------------------------------
   * Methods
   * ---------------------------------------------------------
   */
    function isGroupPopulated (inputFileUuid) {
      if (_.has(vm.groupCollection[vm.currentGroup], inputFileUuid) &&
        vm.groupCollection[vm.currentGroup][inputFileUuid].length > 0) {
        return true;
      }
      return false;
    }

   /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      $scope.$watchCollection(
        function () {
          return vm.displayCtrl.selectedTool;
        },
        function () {
          angular.copy(vm.displayCtrl.selectedTool, vm.tool);
          vm.inputFilesTypes = fileService.inputFileTypes;
          vm.currentGroup = fileService.currentGroup;

          if (vm.tool.toolType === 'Workflow') {
            vm.toolType = vm.tool.toolType;
          }
        }
      );

      $scope.$watchCollection(
        function () {
          return fileService.groupCollection;
        },
        function () {
          vm.groupCollection = fileService.groupCollection;
          vm.inputFilesTypes = fileService.inputFileTypes;
          vm.currentGroup = fileService.currentGroup;
        }
      );
    };
  }
})();
