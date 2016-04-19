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

  //modal close button
  $scope.close = function () {
    resetGridService.setResetGridFlag(true);
    $uibModalInstance.close('close');
  };

  //Refresh attribute lists when modal opens
  vm.refreshAssayAttributes = function () {
    var assay_uuid = $window.externalAssayUuid;
    return fileBrowserFactory.getAssayAttributeOrder(assay_uuid).then(function(){
      vm.assayAttributeOrder = fileBrowserFactory.assayAttributeOrder;
    },function(error){
      console.log(error);
    });
  };

  //Update ranks and attributes for owners
  vm.updateAssayAttributes = function(attributeParam){
    fileBrowserFactory.postAssayAttributeOrder(attributeParam).then(function () {
    });
  };

  //update rank of item moved
  vm.updateAttributeRank = function(attributeObj, index){
    //when item is moved, it's duplication is removed
    vm.assayAttributeOrder.splice(index, 1);

    for(var i=0; i<vm.assayAttributeOrder.length; i++){
      //locally update all ranks
      vm.assayAttributeOrder[i].rank = i + 1;
      if(vm.assayAttributeOrder[i].solr_field === attributeObj.solr_field){
        //post rank update for attribute moved
        vm.updateAssayAttributes(vm.assayAttributeOrder[i]);
      }
    }
  };

  vm.refreshAssayAttributes();
}
