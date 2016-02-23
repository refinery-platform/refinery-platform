angular.module('refineryFileBrowser')
    .controller('FileBrowserCtrl',
    ['fileBrowserFactory', FileBrowserCtrl]);


function FileBrowserCtrl(fileBrowserFactory) {
  "use strict";
  var vm = this;
  vm.assayFiles = [];

  vm.updateAssayFiles = function () {
    var param = {
      format: 'json',
      'uuid': '5eff885e-49cb-477a-ad76-f65d74d78f8a',
    };

    return fileBrowserFactory.getAssayFiles(param).then(function (response) {
      vm.assayFiles = fileBrowserFactory.assayFiles;
      console.log("in ctrl");
      console.log(vm.assayFiles);
      return response;
    });
  };

  vm.updateAssayFiles();

}
