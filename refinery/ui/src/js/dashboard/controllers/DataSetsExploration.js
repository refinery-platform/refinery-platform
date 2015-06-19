function DataSetsExplorationCtrl ($stateParams) {
  var that = this;

  that.test = 'Data Set Exploration';

  console.log('Uhhh we initialize  DataSetsExplorationCtrl');
}

angular
  .module('refineryDashboard')
  .controller('DataSetsExplorationCtrl', [
    '$stateParams',
    DataSetsExplorationCtrl
  ]);
