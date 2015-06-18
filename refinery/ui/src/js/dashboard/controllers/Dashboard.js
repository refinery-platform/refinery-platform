function DashboardCtrl (
  $q,
  $state,
  $timeout,
  dataSetService,
  projectService,
  analysisService,
  workflowService) {
  // Store the context.
  var that = this;

  // Construct Angular modules
  that.$state = $state;
  that.$timeout = $timeout;
  that.$q = $q;

  // Construct Refinery modules
  that.dataSetService = dataSetService;
  that.projectService = projectService;
  that.analysisService = analysisService;
  that.workflowService = workflowService;

  // Construct class variables
  that.expandDataSetPanel = false;
  that.dataSetServiceLoading = false;

  // Get data
  that.getDataSets().then(function (results) {
    that.allDataSets = results;
  });

  that.getProjects().then(function (results) {
    that.allProjects = results;
  });

  that.getAnalyses().then(function (results) {
    that.allAnalyses = results;
  });

  that.getWorkflows().then(function (results) {
    that.allWorkflows = results;
  });

  that.getMoreDataSets = function () {
    console.log(
      'Load more data sets.',
      that.allDataSets.meta.limit,
      that.allDataSets.meta.offset
    );
    if (that.allDataSets.meta.next !== null) {
      that.getDataSets({
        limit: that.allDataSets.meta.limit,
        offset: that.allDataSets.meta.offset + that.allDataSets.meta.limit
      }).then(function (results) {
        that.allDataSets.meta = results.meta;
        that.allDataSets.objects.push.apply(
          that.allDataSets.objects,
          results.objects
        );
      });
    }
  };
}

DashboardCtrl.prototype.searchDataSets = function (name) {
  var that = this;

  if (name) {
    that.expandDataSetPanel = true;
    that.$timeout(function () {
      that.$state.go('dataSetsExploration');
    }, 250);
  } else {
    that.expandDataSetPanel = false;
    that.$state.go('launchPad');
  }
};

DashboardCtrl.prototype.getDataSets = function (limit, offset) {
  var that = this,
      dataSets;

  that.dataSetServiceLoading = true;

  dataSets = that.dataSetService.query();
  dataSets
    .$promise
    .then(
      /* Success */
      function (results) {
        that.dataSetServiceLoading = false;
      },
      /* Failure */
      function (error) {
        that.dataSetServiceLoading = false;
      }
    );

  return dataSets.$promise;
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
    'dataSetService',
    'projectService',
    'analysisService',
    'workflowService',
    DashboardCtrl
  ]);
