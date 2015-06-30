function DashboardCtrl (
  // Angular modules
  $q,
  $state,
  $timeout,
  $rootScope,
  // 3rd party library
  _,
  // Refinery modules
  settings,
  authService,
  projectService,
  analysisService,
  workflowService,
  dashboardDataSetService,
  dashboardDataSetListService,
  dashboardDataSetSearchService,
  dashboardDataSetSourceService,
  dashboardDataSetReloadService) {
  // Store the context.
  var that = this;

  // Construct Angular modules
  that.$q = $q;
  that.$state = $state;
  that.$timeout = $timeout;

  // Construct 3rd party library
  that._ = _;

  // Construct Refinery modules
  that.authService = authService;
  that.projectService = projectService;
  that.analysisService = analysisService;
  that.workflowService = workflowService;
  that.dashboardDataSetListService = dashboardDataSetListService;
  that.dashboardDataSetSearchService = dashboardDataSetSearchService;
  that.dashboardDataSetSourceService = dashboardDataSetSourceService;
  that.dashboardDataSetReloadService = dashboardDataSetReloadService;

  // Construct class variables
  that.dataSetServiceLoading = false;

  // Check authentication
  // This should idealy be moved to the global APP controller, which we don't
  // have right now.
  that.authService.isAuthenticated().then(function (isAuthenticated) {
    that.userIsAuthenticated = isAuthenticated;
  });
  that.authService.isAdmin().then(function (isAdmin) {
    that.userIsAdmin = isAdmin;
  });

  // Get data
  that.getProjects()
    .then(function (results) {
      that.allProjects = results;
    })
    .catch(function (error) {
      that.allProjects = [];
    });

  that.getAnalyses()
    .then(function (results) {
      that.allAnalyses = results;
    })
    .catch(function (error) {
      that.allAnalyses = [];
    });

  that.getWorkflows()
    .then(function (results) {
      that.allWorkflows = results;
    })
    .catch(function (error) {
      that.allWorkflows = [];
    });

  that.dataSets = dashboardDataSetService;

  that.searchDataSets = that._.debounce(
    that.setDataSetSource,
    settings.debounceSearch
  );

  // Initilize data set source
  that.setDataSetSource();

  // Set reloader
  that.dashboardDataSetReloadService.setReload(function (hardReset) {
    if (hardReset) {
      that.dataSets.resetCache(undefined, hardReset);
    }
    // Reset current list and reload uiScroll
    if (that.dataSetsAdapter) {
      that.dataSetsAdapter.applyUpdates(function (item, scope) {
        return [];
      });
      that.dataSetsAdapter.reload();
    }
  });

  $rootScope.$on('$stateChangeSuccess', function () {
    $timeout(window.sizing, 0);
  });

  $timeout(function () {
    that.$state.go('launchPad');
  }, 0);
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

DashboardCtrl.prototype.resetDataSetSearch = function () {
  this.searchQueryDataSets = '';
  this.setDataSetSource();
};

DashboardCtrl.prototype.setDataSetSource = function (searchQuery) {
  var that = this;

  if (searchQuery) {
    that.searchDataSet = true;
    var searchResults = new that.dashboardDataSetSearchService(searchQuery);
    that.dashboardDataSetSourceService.setSource(searchResults);
    that.dataSets.resetCache(searchQuery);
  } else {
    that.searchDataSet = false;
    that.dashboardDataSetSourceService.setSource(that.dashboardDataSetListService);
    that.dataSets.resetCache();
  }

  that.dashboardDataSetReloadService.reload();
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
    '$rootScope',
    '_',
    'settings',
    'authService',
    'projectService',
    'analysisService',
    'workflowService',
    'dashboardDataSetService',
    'dashboardDataSetListService',
    'dashboardDataSetSearchService',
    'dashboardDataSetSourceService',
    'dashboardDataSetReloadService',
    DashboardCtrl
  ]);
