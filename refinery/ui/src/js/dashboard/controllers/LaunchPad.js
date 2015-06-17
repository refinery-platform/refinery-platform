function LaunchPadCtrl (projectService) {
  var that = this;

  that.projectServiceLoading = false;

  projects = that.projectService.query();
  projects
    .$promise
    .then(
      /* Success */
      function (results) {
        that.projectServiceLoading = false;
      },
      /* Failure */
      function (error) {
        that.projectServiceLoading = false;
      }
    );
}

angular
  .module('refineryDashboard')
  .controller('LaunchPadCtrl', [
    'projectService',
    LaunchPadCtrl
  ]);
