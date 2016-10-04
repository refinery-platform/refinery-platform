/**
 * Created by scott on 9/28/16.
 */

'use strict';

function AnalysisDeleteCtrl (
  $log,
  $uibModalInstance,
  _,
  deletionService,
  config,
  analysis,
  analyses,
  analysesReloadService,
  isOwner,
  dashboardDataSetsReloadService
) {
  this.$log = $log;
  this._ = _;
  this.config = config;
  this.analysis = analysis;
  this.analyses = analyses;
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
      if (response.status === 200) {
        that.deleteSuccessful = true;
        that.dashboardDataSetsReloadService.reload(true);
        that.analyses.newOrCachedCache(undefined, true);
        that.analysesReloadService.reload();
      } else {
        that.deletionMessage = response.data;
      }
    })
    .catch(function (error) {
      that.$log.error(error);
    })
    .finally(function () {
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
    'analysesReloadService',
    'isOwner',
    'dashboardDataSetsReloadService',
    AnalysisDeleteCtrl
  ]);
