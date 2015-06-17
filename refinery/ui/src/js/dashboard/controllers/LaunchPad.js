function LaunchPadCtrl ($scope, $state, $timeout, dataSets) {
  var ctrl = this;

  ctrl.dataSets = dataSets.query();

  $scope.$watch(function () {
    return ctrl.searchQueryDataSets;
  }, function (query) {
    if (query) {
      ctrl.expandDataSetPanel = true;
      $timeout(function () {
        $state.go('dataSetsExploration');
      }, 200);
    }
  });
}

angular
  .module('refineryDashboard')
  .controller('LaunchPadCtrl', [
    '$scope',
    '$state',
    '$timeout',
    'dataSets',
    LaunchPadCtrl
  ]);
