function DashboardCtrl ($state, $timeout) {
  var that = this;

  that.$state = $state;
  that.$timeout = $timeout;
  that.expandDataSetPanel = false;
}

DashboardCtrl.prototype.searchDataSets = function(name) {
  var that = this;

  if (name) {
    that.expandDataSetPanel = true;
    that.$timeout(function () {
      that.$state.go('dataSetsExploration');
    }, 200);
  } else {
    that.expandDataSetPanel = false;
    that.$state.go('launchPad');
  }
};

angular
  .module('refineryDashboard')
  .controller('DashboardCtrl', [
    '$state',
    '$timeout',
    DashboardCtrl
  ]);
