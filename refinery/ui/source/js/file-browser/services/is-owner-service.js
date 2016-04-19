angular.module('refineryFileBrowser')
    .service("isOwnerService", [
      'dataSetService',
      '$window',
      isOwnerService
  ]
);

function isOwnerService(dataSetService, $window) {
  var vm = this;
  vm.is_owner = false;

  vm.refreshDataSetOwner = function (){
    var params = {uuid: $window.dataSetUuid};
    var dataSet = dataSetService.query(params);
    dataSet.$promise.then(function(response){
      vm.is_owner = response.objects[0].is_owner;
    });
    return dataSet.$promise;
  };

}
