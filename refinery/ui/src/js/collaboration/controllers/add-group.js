function AddGroupCtrl($modalInstance, groupService, groupDataService) {
  var that = this;
  that.$modalInstance = $modalInstance;
  that.groupService = groupService;
  that.groupDataService = groupDataService;
}

AddGroupCtrl.prototype.createGroup = function (name) {
  var that = this;
  
  this.groupService.create({
    name: name
  }).$promise.then(
    function (data) {
      that.groupDataService.update();
      that.$modalInstance.dismiss();
    }
  ).catch(function (error) {
    console.error(error);
  });
};

angular
  .module('refineryCollaboration')
  .controller('AddGroupCtrl', [
    '$modalInstance',
    'groupService',
    'groupDataService',
    AddGroupCtrl
  ]);
