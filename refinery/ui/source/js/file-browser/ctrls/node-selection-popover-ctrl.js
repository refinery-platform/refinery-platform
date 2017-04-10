(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .controller('NodeSelectionPopoverCtrl', NodeSelectionPopoverCtrl);

  NodeSelectionPopoverCtrl.$inject = [
    '$scope',
    'fileRelationshipService'
  ];


  function NodeSelectionPopoverCtrl (
    $scope,
    fileRelationshipService
  ) {
    var vm = this;
    vm.inputFileTypes = [];


  /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    // MOVE TO A SEPERATE DIRECTIVE
    $scope.$watchCollection(
      function () {
        return fileRelationshipService.inputFileTypes;
      },
      function () {
        vm.inputFileTypes = fileRelationshipService.inputFileTypes;
      }
    );
  }
})();
