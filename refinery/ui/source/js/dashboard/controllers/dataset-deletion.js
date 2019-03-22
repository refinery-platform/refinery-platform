'use strict';

function DataSetDeleteCtrl (
  $log,
  settings,
  $uibModalInstance,
  _,
  deletionService,
  config,
  dataSet
) {
  this.$log = $log;
  this._ = _;
  this.config = config;
  this.dataSet = dataSet;
  this.$uibModalInstance = $uibModalInstance;
  this.deletionService = deletionService;
  this.userProfileUuid = settings.djangoApp.userprofileUUID;
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
 * Close modal after deletion.
 * @type  {function}
 */
DataSetDeleteCtrl.prototype.close = function () {
  this.deletionMessage = null;
  this.$uibModalInstance.close('close');
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
  vm.userProfileUuid = this.userProfileUuid;

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
    });
};

angular
  .module('refineryDashboard')
  .controller('DataSetDeleteCtrl', [
    '$log',
    'settings',
    '$uibModalInstance',
    '_',
    'deletionService',
    'config',
    'dataSet',
    DataSetDeleteCtrl
  ]);
