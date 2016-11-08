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
  isOwner,
  invalidateUiScrollCache
) {
  this.$log = $log;
  this._ = _;
  this.config = config;
  this.analysis = analysis;
  this.analyses = analyses;
  this.dataSets = dataSets;
  this.$uibModalInstance = $uibModalInstance;
  this.deletionService = deletionService;
  this.isOwner = isOwner;
  this.invalidateUiScrollCache = invalidateUiScrollCache;
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

  vm
    .deletionService
    .delete({
      model: this.config.model,
      uuid: this.config.uuid
    })
    .$promise
    .then(function (response) {
      vm.deletionMessage = response.data;
      vm.isDeleting = false;
      vm.deleteSuccessful = true;
      vm.invalidateUiScrollCache();
    })
    .catch(function (error) {
      vm.deletionMessage = error.data;
      vm.isDeleting = false;
      vm.invalidateUiScrollCache();
      vm.$log.error(error);
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
    'isOwner',
    'invalidateUiScrollCache',
    AnalysisDeleteCtrl
  ]);
