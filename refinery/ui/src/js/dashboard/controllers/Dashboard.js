function DashboardCtrl ($q, $state, $timeout, dataSetsService) {
  var that = this;

  that.$state = $state;
  that.$timeout = $timeout;
  that.$q = $q;

  that.dataSetsService = dataSetsService;

  that.expandDataSetPanel = false;
  that.dataSetsServiceLoading = false;

  that.getDataSets().then(function (results) {
    that.allDataSets = results;
  });
}

DashboardCtrl.prototype.searchDataSets = function (name) {
  var that = this;

  if (name) {
    that.expandDataSetPanel = true;
    that.$timeout(function () {
      that.$state.go('dataSetsExploration');
    }, 250);
  } else {
    that.expandDataSetPanel = false;
    that.$state.go('launchPad');
  }
};

DashboardCtrl.prototype.getDataSets = function (limit, offset) {
  var that = this,
      dataSets;

  that.dataSetsServiceLoading = true;

  dataSets = that.dataSetsService.query();
  dataSets
    .$promise
    .then(
      /* Success */
      function (results) {
        that.dataSetsServiceLoading = false;
      },
      /* Failure */
      function (error) {
        that.dataSetsServiceLoading = false;
      }
    );

  return dataSets.$promise;
};

angular
  .module('refineryDashboard')
  .controller('DashboardCtrl', [
    '$q',
    '$state',
    '$timeout',
    'dataSetsService',
    DashboardCtrl
  ]);
