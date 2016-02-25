angular.module('refineryFileBrowser')
    .controller('FileBrowserCtrl',
    ['fileBrowserFactory','$window', FileBrowserCtrl]);


function FileBrowserCtrl(fileBrowserFactory, $window) {
  "use strict";
  var vm = this;
  vm.assayFiles = [];
  vm.assayAttributes = [];

  vm.updateAssayFiles = function () {
    var param = {
      'uuid': $window.externalAssayUuid
    };

    return fileBrowserFactory.getAssayFiles(param).then(function (response) {
      vm.assayFiles = fileBrowserFactory.assayFiles;
      vm.assayAttributes = fileBrowserFactory.assayAttributes;
      return response;
    });
  };
}
