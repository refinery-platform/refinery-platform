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
    vm.currentTypes = [];
    vm.groupCollection = {};
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
          vm.currentTypes = fileService.currentTypes;
          vm.groupCollection = fileService.groupCollection;
          vm.inputFileTypeColor = fileService.inputFileTypeColor;
        }
      );
    };
  }
})();
