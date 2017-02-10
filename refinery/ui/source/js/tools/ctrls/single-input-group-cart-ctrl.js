(function () {
  'use strict';

  angular
    .module('refineryTools')
    .controller('SingleInputGroupCartCtrl', SingleInputGroupCartCtrl);

  SingleInputGroupCartCtrl.$inject = ['$scope'];


  function SingleInputGroupCartCtrl ($scope) {
    var vm = this;
    vm.groupIndex = 0;
    vm.isToolInfoCollapsed = false;
    // need to add set input group

    vm.$onInit = function () {
      vm.group = vm.navCtrl.groups[0];
      $scope.$watch(
        function () {
          return vm.navCtrl.groupIndex;
        },
        function () {
          vm.groupIndex = vm.navCtrl.groupIndex;
          vm.group = vm.navCtrl.groups[vm.groupIndex];
        }
      );
    };
  }
})();
