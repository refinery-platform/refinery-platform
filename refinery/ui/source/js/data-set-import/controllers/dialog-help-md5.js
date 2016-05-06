'use strict';

var RefineryFileUploadMD5HelpCtrl = function ($uibModalInstance) {
  this.ok = function () {
    $uibModalInstance.close();
  };
};

angular
  .module('refineryDataSetImport')
  .controller('RefineryFileUploadMD5HelpCtrl', [
    '$uibModalInstance', RefineryFileUploadMD5HelpCtrl
  ]);
