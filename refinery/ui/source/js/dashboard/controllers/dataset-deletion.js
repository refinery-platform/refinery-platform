'use strict';

function DataSetDeleteCtrl (
  $log,
  $uibModalInstance,
  _,
  deletionService,
  config,
  dataSet,
  dataSets,
  analyses,
  invalidateUiScrollCache
) {
  this.$log = $log;
  this._ = _;
  this.config = config;
  this.dataSet = dataSet;
  this.dataSets = dataSets;
  this.analyses = analyses;
  this.$uibModalInstance = $uibModalInstance;
  this.deletionService = deletionService;
  this.invalidateUiScrollCache = invalidateUiScrollCache;
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
    }, function (error) {
      vm.deletionMessage = error.data;
      vm.isDeleting = false;
      vm.invalidateUiScrollCache();
      vm.$log.error(error);
    });
};

angular
  .module('refineryDashboard')
  .controller('DataSetDeleteCtrl', [
    '$log',
    '$uibModalInstance',
    '_',
    'deletionService',
    'config',
    'dataSet',
    'dataSets',
    'analyses',
    'invalidateUiScrollCache',
    DataSetDeleteCtrl
  ]);
