function LaunchPadCtrl ($modal) {
  var that = this;

  that.openPermissionEditor = function (api, uuid) {
    var modalInstance = $modal.open({
      templateUrl: '/static/partials/dashboard/partials/permission.modal.html',
      controller: 'PermissionEditorCtrl as modal',
      resolve: {
        params: function () {
          return {
            api: api,
            uuid: uuid
          };
        }
      }
    });
  };
}

angular
  .module('refineryDashboard')
  .controller('LaunchPadCtrl', [
    '$modal',
    LaunchPadCtrl
  ]);
