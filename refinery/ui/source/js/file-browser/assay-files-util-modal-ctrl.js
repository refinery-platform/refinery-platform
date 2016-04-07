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

  $scope.ok = function () {

    console.log("in scope okay");
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };

  $scope.close = function () {
    //set up a watcher to reset grid
    //$scope.$emit('rf/assay-files-util-modal-close');
    console.log('in the close scope');
    resetGridService.setResetGridFlag(true);
    $uibModalInstance.close('close');
  };

  vm.refreshAssayAttributes = function () {
   // console.log('in refresh');
    var assay_uuid = $window.externalAssayUuid;
    return fileBrowserFactory.getAssayAttributeOrder(assay_uuid).then(function(){
      vm.assayAttributeOrder = fileBrowserFactory.assayAttributeOrder;
     // console.log('in the refresh promises');
    //  console.log(vm.assayAttributeOrder);
    },function(error){
      console.log(error);
    });
  };

  vm.updateAssayAttributes = function(attributeParam){
    fileBrowserFactory.postAssayAttributeOrder(attributeParam).then(function(){
    //  vm.reset();
    });
  };

  vm.refreshAssayAttributes();
  //$scope.view = function () {
  //  $uibModalInstance.close('view');
  //  $window.location.href = '/data_sets/' + dataSetUuid + '/#/analyses';
  //};

}
