function DataSetsExplorationCtrl ($stateParams) {
  var that = this;

  that.test = 'Data Set Exploration';
}

angular
  .module('refineryDashboard')
  .controller('DataSetsExplorationCtrl', [
    '$stateParams',
    DataSetsExplorationCtrl
  ]);
