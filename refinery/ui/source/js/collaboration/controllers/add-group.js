'use strict';

function AddGroupCtrl (
  bootbox, $uibModalInstance, groupExtendedService, groupDataService
) {
  this.bootbox = bootbox;
  this.$uibModalInstance = $uibModalInstance;
  this.groupExtendedService = groupExtendedService;
  this.groupDataService = groupDataService;
}

function isEmptyOrSpaces (str) {
  if (str.length === 0) {
    return true;
  }
  return false;
}

AddGroupCtrl.prototype.createGroup = function (name) {
  var that = this;
  var groupName = name || '';

  this.groupExtendedService.create({
    name: groupName
  })
  .$promise
  .then(function () {
    that.groupDataService.update();
    that.$uibModalInstance.dismiss();
  })
  .catch(function () {
    if (isEmptyOrSpaces(groupName)) {
      that.bootbox.alert(
        'Group Name cannot be left blank - try a different name.'
      );
    } else {
      that.bootbox.alert(
        'This name probably already exists - try a different name.'
      );
    }
  });
};

angular
  .module('refineryCollaboration')
  .controller('AddGroupCtrl', [
    'bootbox',
    '$uibModalInstance',
    'groupExtendedService',
    'groupDataService',
    AddGroupCtrl
  ]);
