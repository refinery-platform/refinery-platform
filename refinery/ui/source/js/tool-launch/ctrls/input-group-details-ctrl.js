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
    vm.currentGroup = [];
    vm.currentTypes = [];
    vm.groupCollection = {};
    vm.inputFileTypes = [];
    vm.inputFileTypeColor = {};

   /*
   * ---------------------------------------------------------
   * Methods
   * ---------------------------------------------------------
   */
  /**
    /**

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
          console.log(vm.inputFileTypes);
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
