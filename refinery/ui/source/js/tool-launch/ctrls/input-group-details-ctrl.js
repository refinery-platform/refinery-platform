(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('InputGroupDetailsCtrl', InputGroupDetailsCtrl);

  InputGroupDetailsCtrl.$inject = [
    '$scope'
  ];


  function InputGroupDetailsCtrl (
    $scope
  ) {
    var vm = this;
    vm.attributes = {};
    vm.collapseDetails = true;
    vm.currentGroup = [];
    vm.currentTypes = [];
    vm.groupCollection = {};
    vm.inputFileTypes = [];
    vm.inputFileTypeColor = {};
    vm.toggleCollapseDetails = toggleCollapseDetails;

   /*
   * ---------------------------------------------------------
   * Methods
   * ---------------------------------------------------------
   */
    // view method which sets to hide input detail panel
    function toggleCollapseDetails () {
      if (vm.collapseDetails) {
        vm.collapseDetails = false;
      } else {
        vm.collapseDetails = true;
      }
      return vm.collapseDetails;
    }

   /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      vm.isGroupPopulated = vm.inputCtrl.isGroupPopulated;

      $scope.$watchCollection(
        function () {
          return vm.inputCtrl.selectedTool;
        },
        function () {
          vm.inputFileTypes = vm.inputCtrl.inputFileTypes;
          vm.currentGroup = vm.inputCtrl.currentGroup;
          vm.currentTypes = vm.inputCtrl.currentTypes;
          vm.groupCollection = vm.inputCtrl.groupCollection;
          vm.inputFileTypeColor = vm.inputCtrl.inputFileTypeColor;
          vm.attributes = vm.inputCtrl.attributes;
        }
      );

      $scope.$watchCollection(
        function () {
          return vm.inputCtrl.groupCollection;
        },
        function () {
          vm.groupCollection = vm.inputCtrl.groupCollection;
          vm.currentGroup = vm.inputCtrl.currentGroup;
          vm.inputFileTypeColor = vm.inputCtrl.inputFileTypeColor;
        }
      );
    };
  }
})();
