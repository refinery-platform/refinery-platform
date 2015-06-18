function LaunchPadCtrl (projectService) {
  var that = this;

  window.sizing();
}

angular
  .module('refineryDashboard')
  .controller('LaunchPadCtrl', [
    'projectService',
    LaunchPadCtrl
  ]);
