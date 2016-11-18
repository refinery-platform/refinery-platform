'use strict';

function AnalysisDeleteCtrl (
  $log,
  $uibModalInstance,
  _,
  deletionService,
  config,
  analysis,
  analyses,
  dataSets,
  analysesReloadService,
  isOwner,
  dashboardDataSetsReloadService
) {
  this.$log = $log;
  this._ = _;
  this.config = config;
  this.analysis = analysis;
  this.analyses = analyses;
  this.dataSets = dataSets;
  this.$uibModalInstance = $uibModalInstance;
  this.deletionService = deletionService;
  this.analysesReloadService = analysesReloadService;
  this.isOwner = isOwner;
  this.dashboardDataSetsReloadService = dashboardDataSetsReloadService;
}

/**
 * Cancel object deletion.
 * @type  {function}
 */
AnalysisDeleteCtrl.prototype.cancel = function () {
  this.deletionMessage = null;
  this.$uibModalInstance.dismiss('cancel');
};

/**
 * Delete an Analysis
 * @type   {function}
 */
AnalysisDeleteCtrl.prototype.delete = function () {
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
      that.deletionMessage = response.data;
      that.isDeleting = false;
      that.deleteSuccessful = true;
      that.dataSets.newOrCachedCache(undefined, true);
      that.dashboardDataSetsReloadService.reload(true);
      that.analyses.newOrCachedCache(undefined, true);
      that.analysesReloadService.reload();
    })
    .catch(function (error) {
      that.deleteSuccessful = false;
      that.deletionMessage = error.data;
      that.$log.error(error);
    });
};

angular
  .module('refineryDashboard')
  .controller('AnalysisDeleteCtrl', [
    '$log',
    '$uibModalInstance',
    '_',
    'deletionService',
    'config',
    'analysis',
    'analyses',
    'dataSets',
    'analysesReloadService',
    'isOwner',
    'dashboardDataSetsReloadService',
    AnalysisDeleteCtrl
  ]);
