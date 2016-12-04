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
 * Delete an Analysis using the deletionService and invalidate UiScroll cache
 * @type   {function}
 */
AnalysisDeleteCtrl.prototype.delete = function () {
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
