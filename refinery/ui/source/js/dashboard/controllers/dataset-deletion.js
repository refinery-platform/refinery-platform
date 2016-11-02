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
 * Delete a DataSet
 * @type   {function}
 */
DataSetDeleteCtrl.prototype.delete = function () {
  var that = this;

  that.isDeleting = true;
  that.deletionMessage = null;
  that.deleteSuccessful = false;

  this
    .deletionService
    .delete({
      model: this.config.model,
      uuid: this.config.uuid
    })
    .$promise
    .then(function (response) {
      that.deletionMessage = response.content;
      that.isDeleting = false;
      that.deleteSuccessful = true;
      that.dataSets.newOrCachedCache(undefined, true);
      that.dashboardDataSetsReloadService.reload(true);
      that.analyses.newOrCachedCache(undefined, true);
      that.analysesReloadService.reload();
    })
    .catch(function (error) {
      that.deletionMessage = error.data;
      that.isDeleting = false;
      that.dataSets.newOrCachedCache(undefined, true);
      that.dashboardDataSetsReloadService.reload(true);
      that.analyses.newOrCachedCache(undefined, true);
      that.analysesReloadService.reload();
      that.$log.error(error);
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
