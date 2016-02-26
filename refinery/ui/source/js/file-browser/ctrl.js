angular.module('refineryFileBrowser')
    .controller('FileBrowserCtrl',
    [
      'fileBrowserFactory',
      'assayFileService',
      '$window',
      '_',
      'UiScrollSource',
      FileBrowserCtrl
    ]);


function FileBrowserCtrl(fileBrowserFactory, assayFileService, $window, _, UiScrollSource) {
  "use strict";
  var vm = this;
  vm.assayFiles = [];
  vm.assayAttributes = [];

  vm.updateAssayFiles = function (limit, offset) {
    var param = {
      'uuid': $window.externalAssayUuid,
      limit: limit,
      offset: offset
    };

    return fileBrowserFactory.getAssayFiles(param).then(function (response) {
      vm.assayFiles = fileBrowserFactory.assayFiles;
      vm.assayAttributes = fileBrowserFactory.assayAttributes;
      return response;
    });
  };

  vm.assayFiles2 = new UiScrollSource(
    'fileBrowser/assayFiles2',
    1,
    function (limit, offset, extra) {
      var params = _.merge(_.cloneDeep(extra) || {}, {
            limit: limit,
            offset: offset,
            uuid: $window.externalAssayUuid
          });

      return assayFileService.query(params).$promise;
    }.bind(vm),
    'nodes',
    'total_count'
  );

}
