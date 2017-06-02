'use strict';

function DataSetDeleteCtrl (
  $log,
  $uibModalInstance,
  _,
  deletionService,
  dashboardDataSetsReloadService,
  config,
  dataSet,
  dataSets,
  analyses,
  analysesReloadService
) {
  this.$log = $log;
  this._ = _;
  this.config = config;
  this.dataSet = dataSet;
  this.dataSets = dataSets;
  this.analyses = analyses;
  this.$uibModalInstance = $uibModalInstance;
  this.deletionService = deletionService;
  this.analysesReloadService = analysesReloadService;
  this.dashboardDataSetsReloadService = dashboardDataSetsReloadService;
}

/**
 * Cancel object deletion.
 * @type  {function}
 */
DataSetDeleteCtrl.prototype.cancel = function () {
  this.deletionMessage = null;
  this.$uibModalInstance.dismiss('cancel');
};

/**
 * Delete a DataSet using the deletionService and invalidate UiScroll cache
 * @type   {function}
 */
DataSetDeleteCtrl.prototype.delete = function () {
  var vm = this;

  vm.isDeleting = true;
  vm.deletionMessage = null;
  vm.deleteSuccessful = false;

  this
    .deletionService
    .delete({
      model: this.config.model,
      uuid: this.config.uuid
    })
    .$promise
    .then(function (response) {
      vm.deletionMessage = response.data;
      vm.deleteSuccessful = true;
    }, function (error) {
      vm.deletionMessage = error.data;
      vm.$log.error(error.data);
    })
    .finally(function () {
      vm.isDeleting = false;
      vm.dataSets.newOrCachedCache(undefined, true);
      vm.dashboardDataSetsReloadService.reload(true);
      vm.analyses.newOrCachedCache(undefined, true);
      vm.analysesReloadService.reload();
    });
};

angular
  .module('refineryDashboard')
  .controller('DataSetDeleteCtrl', [
    '$log',
    '$uibModalInstance',
    '_',
    'deletionService',
    'dashboardDataSetsReloadService',
    'config',
    'dataSet',
    'dataSets',
    'analyses',
    'analysesReloadService',
    DataSetDeleteCtrl
  ]);
