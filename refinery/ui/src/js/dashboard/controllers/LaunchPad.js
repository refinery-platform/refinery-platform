function LaunchPadCtrl ($modal) {
  var that = this;

  that.openPermissionEditor = function (model, uuid) {
    var modalInstance = $modal.open({
      templateUrl: '/static/partials/dashboard/partials/permission.modal.html',
      controller: 'PermissionEditorCtrl as modal',
      resolve: {
        config: function () {
          return {
            model: model,
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
