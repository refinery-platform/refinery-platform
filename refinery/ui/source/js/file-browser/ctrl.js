angular.module('refineryFileBrowser')
    .controller('FileBrowserCtrl',
    [
      'fileBrowserFactory',
      'assayFileService',
      '$window',
      FileBrowserCtrl
    ]);


function FileBrowserCtrl(fileBrowserFactory, assayFileService, $window) {
  "use strict";
  var vm = this;
  vm.assayFiles = [];
  vm.assayAttributes = [];
  vm.attributeFilter = [];

  vm.updateAssayFiles = function (limit, offset) {
    var param = {
      'uuid': $window.externalAssayUuid,
      limit: limit,
      offset: offset
    };

    return fileBrowserFactory.getAssayFiles(param).then(function (response) {
      vm.assayFiles = fileBrowserFactory.assayFiles;
      vm.assayAttributes = fileBrowserFactory.assayAttributes;
      vm.attributeFilter = fileBrowserFactory.attributeFilter;
      return response;
    });
  };

  vm.updateAssayAttributes = function () {
    var assay_uuid = $window.externalAssayUuid;
    fileBrowserFactory.getAssayAttributeOrder(assay_uuid).then(function(){
      vm.assayAttributeOrder = fileBrowserFactory.assayAttributeOrder;
      console.log(vm.assayAttributeOrder);
    },function(error){
      console.log(error);
    });
  };

}
