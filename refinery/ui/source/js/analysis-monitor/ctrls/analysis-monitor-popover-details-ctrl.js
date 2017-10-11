(function () {
  'use strict';

  angular
    .module('refineryAnalysisMonitor')
    .controller('AnalysisMonitorPopoverDetailsCtrl', AnalysisMonitorPopoverDetailsCtrl);

  AnalysisMonitorPopoverDetailsCtrl.$inject = ['$scope'];

  function AnalysisMonitorPopoverDetailsCtrl ($scope) {
    var vm = this;

    vm.$onInit = function () {
      console.log('in the onInint');
      vm.analysesGlobalLoadingFlag = vm.displayCtrl.analysesGlobalLoadingFlag;
      vm.isAnalysesRunningGlobal = vm.displayCtrl.isAnalysesRunningGlobal;
      vm.analysesGlobalList = vm.displayCtrl.analysesGlobalList;
      vm.analysesGlobalDetail = vm.displayCtrl.analysesGlobalDetail;

      $scope.$watchCollection(
        function () {
          return vm.displayCtrl.analysesGlobalList;
        },
        function () {
          vm.analysesGlobalList = vm.displayCtrl.analysesGlobalList;
          $scope.analysesGlobalDetail = vm.displayCtrl.analysesGlobalDetail;
        }
      );

      $scope.$watch(
        function () {
          return vm.displayCtrl.analysesGlobalLoadingFlag;
        },
        function () {
          vm.analysesGlobalLoadingFlag = vm.displayCtrl.analysesGlobalLoadingFlag;
          vm.isAnalysesRunningGlobal = vm.displayCtrl.isAnalysesRunningGlobal;
          vm.analysesGlobalList = vm.displayCtrl.analysesGlobalList;
          vm.analysesGlobalDetail = vm.displayCtrl.analysesGlobalDetail;
        }
      );
    };
  }
})();
