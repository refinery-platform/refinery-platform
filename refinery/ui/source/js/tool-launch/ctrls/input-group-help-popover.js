(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('InputGroupHelpPopoverCtrl', InputGroupHelpPopoverCtrl);

  InputGroupHelpPopoverCtrl.$inject = [
    '$scope',
    'fileRelationshipService'
  ];

  function InputGroupHelpPopoverCtrl (
    $scope,
    fileRelationshipService
  ) {
    var fileService = fileRelationshipService;
    var vm = this;
    vm.displayInputFile = {};
    vm.inputFileTypes = [];
    vm.inputFileTypeColor = {};

   /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      $scope.$watchCollection(
        function () {
          return fileService.selectedTool;
        },
        function () {
          vm.inputFileTypes = fileService.inputFileTypes;
          vm.inputFileTypeColor = fileService.inputFileTypeColor;
        }
      );

      $scope.$watchCollection(
        function () {
          return fileService.displayInputFile;
        },
        function () {
          vm.displayInputFile = fileService.displayInputFile;
        }
      );
    };
  }
})();
