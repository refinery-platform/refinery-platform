function PermissionEditorCtrl ($scope, $http, $modalInstance, params) {
  var ctrl = this;

  // loadResource(config.api, config.uuid);

  console.log($modalInstance);

  ctrl.save = function () {
    var pTable = document.getElementById('permission-table');
    var cells = pTable.getElementsByTagName('td');
    // Data is clustered into sets of 4 -- i is name, i+1 is noperm, i+2 is readonly, i+3 is edit.
    for (var i = 0; i < cells.length; i += 4) {
      // Add the group.
      var name = cells[i].innerText;
      var id = cells[i].children[0].innerText;

      var canRead = cells[i+2].children[0].checked || cells[i+3].children[0].checked;
      var canChange = cells[i+3].children[0].checked;

      var data = '{"read": ' + canRead + ', "change": ' + canChange + '}';

      // need to somehow store the group id in the cells as a hidden thing
      $http({method: 'PATCH', url: 'api/v1/' + config.api + '/' + config.uuid + '_' + id + '/', data: data});
    }
    $modalInstance.dismiss('saved');
  };

  ctrl.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
}

angular
  .module('refineryDashboard')
  .controller('PermissionEditorCtrl', [
    '$scope',
    '$http',
    '$modalInstance',
    'params',
    PermissionEditorCtrl
  ]);
