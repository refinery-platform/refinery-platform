angular.module('refineryFileBrowser')
    .controller('AssayFilesUtilModalCtrl',
    [
      '$scope',
      '$uibModalInstance',
      '$window',
      'fileBrowserFactory',
      'resetGridService',
      AssayFilesUtilModalCtrl
    ]
);


function AssayFilesUtilModalCtrl(
  $scope,
  $uibModalInstance,
  $window,
  fileBrowserFactory,
  resetGridService
){

  var vm = this;
  vm.assayAttributeOrder = [];
  $scope.assayAttributeOrder = [];
  $scope.selected = null;

  $scope.close = function () {
    resetGridService.setResetGridFlag(true);
    $uibModalInstance.close('close');
  };

  //update rank of item moved
  $scope.updateAttributeRank = function(attributeObj, index){
    $scope.assayAttributeOrder.splice(index, 1);

    for(var i=0; i<$scope.assayAttributeOrder.length; i++){
      //locally update all ranks
      $scope.assayAttributeOrder[i].rank = i + 1;
      if($scope.assayAttributeOrder[i].solr_field === attributeObj.solr_field){
        vm.updateAssayAttributes($scope.assayAttributeOrder[i]);
      }
    }
  };

  vm.refreshAssayAttributes = function () {
    var assay_uuid = $window.externalAssayUuid;
    return fileBrowserFactory.getAssayAttributeOrder(assay_uuid).then(function(){
      $scope.assayAttributeOrder = fileBrowserFactory.assayAttributeOrder;
    },function(error){
      console.log(error);
    });
  };

  vm.updateAssayAttributes = function(attributeParam){
    if(vm.is_owner) {
      fileBrowserFactory.postAssayAttributeOrder(attributeParam).then(function () {
        vm.refreshAssayAttributes();
      });
    } else {
      console.log(attributeParam);
    }
  };

  vm.refreshAssayAttributes();
}
