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
  vm.analysisFilter = [];

  //vm.updateAssayFiles = function (filterAttribute, limit, offset) {
  vm.updateAssayFiles = function (param) {
    param.uuid = $window.externalAssayUuid;

    return fileBrowserFactory.getAssayFiles(param).then(function (response) {
      vm.assayFiles = fileBrowserFactory.assayFiles;
      vm.assayAttributes = fileBrowserFactory.assayAttributes;
      vm.attributeFilter = fileBrowserFactory.attributeFilter;
      vm.analysisFilter = fileBrowserFactory.analysisFilter;
      return response;
    });
  };

  vm.updateAssayAttributes = function () {
    var assay_uuid = $window.externalAssayUuid;
    fileBrowserFactory.getAssayAttributeOrder(assay_uuid).then(function(){
      vm.assayAttributeOrder = fileBrowserFactory.assayAttributeOrder;
    },function(error){
      console.log(error);
    });
  };

}
