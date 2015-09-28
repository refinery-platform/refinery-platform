function AddGroupCtrl($modalInstance, groupService, groupDataService) {
  var that = this;
  that.$modalInstance = $modalInstance;
  that.groupService = groupService;
  that.groupDataService = groupDataService;
}

function isEmptyOrSpaces(str){

  if (str.length === 0) {
    return true;
  }

}


AddGroupCtrl.prototype.createGroup = function (name) {
  var that = this;
  if (name === undefined){
    name = "";
  }
  this.groupService.create({name: name }).$promise.then(function (data) {

      that.groupDataService.update();
      that.$modalInstance.dismiss();

    }
  ).catch(function (error) {

    if(isEmptyOrSpaces(name)){
      bootbox.alert("Group Name cannot be left blank - try a different name.");
    }
    else{
      console.error(error);
      bootbox.alert("This name probably already exists - try a different name.");
    }

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
