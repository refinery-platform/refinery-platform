function AddGroupCtrl($modalInstance, groupService, groupListService) {
  var that = this;
  that.$modalInstance = $modalInstance;
  that.groupService = groupService;
  that.groupListService = groupListService;
}

AddGroupCtrl.prototype.createGroup = function (name) {
  var that = this;
  
  this.groupService.create({
    name: name
  }).$promise.then(
    function (data) {
      that.groupListService.update();
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
    'groupListService',
    AddGroupCtrl
  ]);
