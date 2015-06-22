function DashboardCtrl (
  // Angular modules
  $q,
  $state,
  $timeout,
  // 3rd party library
  _,
  // Refinery modules
  settings,
  solrService,
  dataSetService,
  projectService,
  analysisService,
  workflowService,
  dashboardDataSetService,
  dashboardDataSetSourceService) {
  // Store the context.
  var that = this;

  // Construct Angular modules
  that.$q = $q;
  that.$state = $state;
  that.$timeout = $timeout;

  // Construct 3rd party library
  that._ = _;

  // Construct Refinery modules
  that.solrService = solrService;
  that.dataSetService = dataSetService;
  that.projectService = projectService;
  that.analysisService = analysisService;
  that.workflowService = workflowService;
  that.dashboardDataSetSourceService = dashboardDataSetSourceService;


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

  that.searchDataSets = that._.debounce(function (name) {
    if (name) {
      // Switch source of data sets.
      that.setDataSetSource(name);
      // Trigger uiScroll to revaluate

    } else {
      that.setDataSetSource();
    }
  }, settings.debounceSearch);

  // Initilize data set source
  that.setDataSetSource();
}

/*
 * -----------------------------------------------------------------------------
 * Define prototype
 * -----------------------------------------------------------------------------
 */
Object.defineProperty(
  DashboardCtrl.prototype,
  'expandDataSetPanel', {
    enumerable: true,
    configurable: false,
    value: false,
    writable: true
});

DashboardCtrl.prototype.toggleDataSetsExploration = function () {
  var that = this;

  that.expandDataSetPanel = !that.expandDataSetPanel;
  that.$timeout(function () {
    if (that.expandDataSetPanel === true) {
      that.$state.go('dataSetsExploration');
    } else {
      that.$state.go('launchPad');
    }
  }, 250);
};

DashboardCtrl.prototype.setDataSetSource = function (searchQuery) {
  var that = this;

  if (searchQuery) {
    that.dashboardDataSetSourceService.setSource(function (limit, offset) {
      var deferred = that.$q.defer(),
          query = that.solrService.get({
            df: 'text',
            fl: 'name,uuid',
            q: searchQuery,
            rows: limit,
            start: offset
          }, {
            index: 'core'
          });

      query
        .$promise
        .then(
          function (data) {
            deferred.resolve({
              meta: {
                total_count: data.response.numFound
              },
              objects: data.response.docs
            });
          },
          function (error) {
            deferred.reject(error);
          }
        );

      return deferred.promise;
    });
    // NOTE Index / offset is not reset to 0!
    that.dataSetsAdapter.applyUpdates(function (item, scope) {
      return [];
    });
    that.dataSets.update('search/' + searchQuery);
  } else {
    that.dashboardDataSetSourceService.setSource(function (limit, offset) {
      var query = that.dataSetService.query({
        limit: limit,
        offset: offset
      });

      return query.$promise;
    });
    that.dataSets.update('all');
  }
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
    '_',
    'settings',
    'solrService',
    'dataSetService',
    'projectService',
    'analysisService',
    'workflowService',
    'dashboardDataSetService',
    'dashboardDataSetSourceService',
    DashboardCtrl
  ]);
