function DashboardCtrl (
  $q,
  $state,
  $timeout,
  projectService,
  analysisService,
  workflowService,
  dashboardDataSetService,
  dataSetSearchInputService) {
  // Store the context.
  var that = this;

  // Construct Angular modules
  that.$state = $state;
  that.$timeout = $timeout;
  that.$q = $q;

  // Construct Refinery modules
  that.projectService = projectService;
  that.analysisService = analysisService;
  that.workflowService = workflowService;
  that.dataSetSearchInputService = dataSetSearchInputService;

  // Construct class variables
  that.dataSetServiceLoading = false;

  // Get data
  that.getProjects().then(function (results) {
    that.allProjects = results;
  });

  that.getAnalyses().then(function (results) {
    that.allAnalyses = results;
  });

  that.getWorkflows().then(function (results) {
    that.allWorkflows = results;
  });

  that.dataSets = dashboardDataSetService;
}

Object.defineProperty(
  DashboardCtrl.prototype,
  'expandDataSetPanel', {
    enumerable: true,
    configurable: false,
    value: false,
    writable: true
});

Object.defineProperty(
  DashboardCtrl.prototype,
  'dataSetInputFocus', {
    enumerable: true,
    configurable: false,
    value: false,
    writable: true
});

DashboardCtrl.prototype.searchDataSets = function (name) {
  var that = this;

  if (name) {
    that.expandDataSetPanel = true;
    that.$timeout(function () {
      that.$state.go('dataSetsExploration');
    }, 250);
  } else {
    that.expandDataSetPanel = false;
    that.$timeout(function () {
      that.$state.go('launchPad');
    }, 250);
  }
};

DashboardCtrl.prototype.blurSearchDataSetsInput = function () {
  this.dataSetSearchInputService.focus = false;
  console.log('Bye', this.dataSetSearchInputService.focus);
};

DashboardCtrl.prototype.focusSearchDataSetsInput = function () {
  this.dataSetSearchInputService.focus = true;
  console.log('Hola', this.dataSetSearchInputService.focus);
};

DashboardCtrl.prototype.getProjects = function (limit, offset) {
  var that = this,
      projects;

  that.projectServiceLoading = true;

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
  return projects.$promise;
};

DashboardCtrl.prototype.getAnalyses = function (limit, offset) {
  var that = this,
      analysis;

  that.analysisServiceLoading = true;

  analysis = that.analysisService.query();
  analysis
    .$promise
    .then(
      /* Success */
      function (results) {
        that.analysisServiceLoading = false;
      },
      /* Failure */
      function (error) {
        that.analysisServiceLoading = false;
      }
    );
  return analysis.$promise;
};

DashboardCtrl.prototype.getWorkflows = function (limit, offset) {
  var that = this,
      workflows;

  that.workflowServiceLoading = true;

  workflows = that.workflowService.query();
  workflows
    .$promise
    .then(
      /* Success */
      function (results) {
        that.workflowServiceLoading = false;
      },
      /* Failure */
      function (error) {
        that.workflowServiceLoading = false;
      }
    );

  return workflows.$promise;
};

angular
  .module('refineryDashboard')
  .controller('DashboardCtrl', [
    '$q',
    '$state',
    '$timeout',
    'projectService',
    'analysisService',
    'workflowService',
    'dashboardDataSetService',
    'dataSetSearchInputService',
    DashboardCtrl
  ]);
