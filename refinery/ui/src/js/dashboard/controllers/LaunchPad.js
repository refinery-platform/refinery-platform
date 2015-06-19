function LaunchPadCtrl (projectService) {
  var that = this;

  window.sizing();

  console.log('LaunchPadCtrl', that);
}

angular
  .module('refineryDashboard')
  .controller('LaunchPadCtrl', [
    'projectService',
    LaunchPadCtrl
  ]);
