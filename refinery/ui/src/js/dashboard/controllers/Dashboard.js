function DashboardCtrl (
  // Angular modules
  $q,
  $sce,
  $state,
  $timeout,
  // 3rd party library
  _,
  // Refinery modules
  settings,
  authService,
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
  that.$sce = $sce;
  that.$state = $state;
  that.$timeout = $timeout;

  // Construct 3rd party library
  that._ = _;

  // Construct Refinery modules
  that.authService = authService;
  that.solrService = solrService;
  that.dataSetService = dataSetService;
  that.projectService = projectService;
  that.analysisService = analysisService;
  that.workflowService = workflowService;
  that.dashboardDataSetSourceService = dashboardDataSetSourceService;

  // Construct class variables
  that.dataSetServiceLoading = false;

  // Check authentication
  that.authService.isAuthenticated().then(function (isAuthenticated) {
    that.userIsAuthenticated = isAuthenticated;
    console.log('authentication? ' + that.userIsAuthenticated);
  });
  that.authService.isAdmin().then(function (isAdmin) {
    that.userIsAdmin = isAdmin;
    console.log('admin? ' + that.userIsAdmin);
  });

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
            'defType': 'dismax',
            'fl': 'id,title,uuid',
            'hl': true,
            'hl.fl': 'content_auto',
            'hl.simple.pre': '<em>',
            'hl.simple.post': '</em>',
            'q': searchQuery,
            'qf': 'content_auto^0.5 text',
            'rows': limit,
            'start': offset
          }, {
            index: 'core'
          });

      query
        .$promise
        .then(
          function (data) {
            var docId ;

            for (var i = 0, len = data.response.docs.length; i < len; i++) {
              docId = data.response.docs[i].id;
              if (data.highlighting[docId]) {
                data.response.docs[i].highlighting = that.$sce.trustAsHtml(data.highlighting[docId].content_auto[0]);
              } else {
                data.response.docs[i].highlighting = false;
              }
            }

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
    if (that.dataSetsAdapter) {
      that.dataSetsAdapter.applyUpdates(function (item, scope) {
        return [];
      });
      that.dataSetsAdapter.reload();
    }
  } else {
    that.dashboardDataSetSourceService.setSource(function (limit, offset) {
      var query = that.dataSetService.query({
        limit: limit,
        offset: offset
      });

      return query.$promise;
    });
    if (that.dataSetsAdapter) {
      that.dataSetsAdapter.applyUpdates(function (item, scope) {
        return [];
      });
      that.dataSetsAdapter.reload();
    }
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
    '$sce',
    '$state',
    '$timeout',
    '_',
    'settings',
    'authService',
    'solrService',
    'dataSetService',
    'projectService',
    'analysisService',
    'workflowService',
    'dashboardDataSetService',
    'dashboardDataSetSourceService',
    DashboardCtrl
  ]);
