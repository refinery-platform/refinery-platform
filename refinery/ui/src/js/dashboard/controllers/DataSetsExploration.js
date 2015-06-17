function DataSetsExplorationCtrl ($stateParams) {
  var that = this;

  that.test = 'Data Set Exploration';

  if (dashboard.searchQueryDataSets) {

  }
}

angular
  .module('refineryDashboard')
  .controller('DataSetsExplorationCtrl', [
    '$stateParams',
    DataSetsExplorationCtrl
  ]);
