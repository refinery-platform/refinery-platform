(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolParamsCtrl', ToolParamsCtrl);

  ToolParamsCtrl.$inject = [
    '$scope',
    'fileRelationshipService'
  ];


  function ToolParamsCtrl (
    $scope,
    fileRelationshipService
  ) {
    var fileService = fileRelationshipService;
    var vm = this;
    vm.params = fileService.attributesObj;
   /*
   * ---------------------------------------------------------
   * Methods Definitions
   * ---------------------------------------------------------
   */

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
          vm.params = fileService.params;
        }
      );
    };
  }
})();
