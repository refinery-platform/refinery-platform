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
  UiScrollSource,
  dashboardDataSetListService,
  dashboardDataSetSearchService,
  dashboardDataSetReloadService,
  dashboardWidthFixerService,
  dashboardExpandablePanelService,
  dashboardDataSetPreviewService) {
  // Construct Angular modules
  this.$q = $q;
  this.$state = $state;
  this.$timeout = $timeout;

  // Construct 3rd party library
  this._ = _;

  // Construct Refinery modules
  this.authService = authService;
  this.projectService = projectService;
  this.analysisService = analysisService;
  this.workflowService = workflowService;
  this.dashboardDataSetListService = dashboardDataSetListService;
  this.dashboardDataSetSearchService = dashboardDataSetSearchService;
  this.dashboardDataSetReloadService = dashboardDataSetReloadService;
  this.dashboardWidthFixerService = dashboardWidthFixerService;
  this.dashboardExpandablePanelService = dashboardExpandablePanelService;
  this.dashboardDataSetPreviewService = dashboardDataSetPreviewService;

  // Construct class variables
  this.dataSetServiceLoading = false;
  this.dataSetPreviewBorder = false;

  // Check authentication
  // This should idealy be moved to the global APP controller, which we don't
  // have right now.
  this.authService.isAuthenticated().then(function (isAuthenticated) {
    this.userIsAuthenticated = isAuthenticated;
  }.bind(this));
  this.authService.isAdmin().then(function (isAdmin) {
    this.userIsAdmin = isAdmin;
  }.bind(this));

  // Set up dataSets for `uiScroll`
  this.dataSets = new UiScrollSource(
    'dashboard/dataSets',
    10,
    this.dashboardDataSetListService
  );

  // Set up analyses for `uiScroll`
  this.analyses = new UiScrollSource(
    'dashboard/analyses',
    1,
    function (limit, offset) {
      return this.analysisService.query({
        limit: limit,
        offset: offset
      }).$promise;
    }.bind(this)
  );

  // Set up projects for `uiScroll`
  // this.projects = new UiScrollSource(
  //   'dashboard/projects',
  //   1,
  //   function (limit, offset) {
  //     return this.projectService.query({
  //       limit: limit,
  //       offset: offset
  //     }).$promise;
  //   }.bind(this)
  // );

  // Set up workflows for `uiScroll`
  this.workflows = new UiScrollSource(
    'dashboard/workflows',
    1,
    function (limit, offset) {
      return this.workflowService.query({
        limit: limit,
        offset: offset
      }).$promise;
    }.bind(this)
  );

  this.searchDataSets = this._.debounce(
    this.setDataSetSource,
    settings.debounceSearch
  ).bind(this);

  // Set reloader
  this.dashboardDataSetReloadService.setReload(function (hardReset) {
    if (hardReset) {
      that.dataSets.resetCache(undefined, hardReset);
    }
    // Reset current list and reload uiScroll
    if (this.dataSetsAdapter) {
      this.dataSetsAdapter.applyUpdates(function (item, scope) {
        return [];
      });
      this.dataSetsAdapter.reload();
    }
  }.bind(this));


  this.dashboardWidthFixerService.resetter.push(function () {
    this.dataSetPreviewBorder = false;
  }.bind(this));

  $rootScope.$on('$stateChangeSuccess', function () {
    $timeout(window.sizing, 0);
  });
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
    if (searchQuery.length > 1) {
      that.searchDataSet = true;
      var searchResults = new this.dashboardDataSetSearchService(searchQuery);
      this.dataSets.set(searchResults, searchQuery);
      // that.dashboardDataSetSourceService.setSource(searchResults);
      // that.dataSets.resetCache(searchQuery);
      that.dashboardDataSetReloadService.reload();
    }
  } else {
    // that.dashboardDataSetSourceService.setSource(that.dashboardDataSetListService);
    // that.dataSets.resetCache();
    this.dataSets.set(this.dashboardDataSetListService);
    if (that.searchDataSet) {
      that.searchDataSet = false;
      that.dashboardDataSetReloadService.reload();
    }
  }
};

DashboardCtrl.prototype.showDataSetPreview = function (dataSet) {
  if (!this.dashboardDataSetPreviewService.previewing) {
    this.dashboardDataSetPreviewService.preview(dataSet);
    this.dashboardWidthFixerService.trigger('fixer');
    this.expandDataSetPanel = true;
    this.dataSetPreview = true;
    this.dataSetPreviewBorder = true;
    this.dashboardExpandablePanelService.trigger('expander');
  } else {
    if (dataSet.preview) {
      this.hideDataSetPreview(dataSet);
    } else {
      this.dashboardDataSetPreviewService.preview(dataSet);
    }
  }
};

DashboardCtrl.prototype.hideDataSetPreview = function (dataSet) {
  this.dashboardDataSetPreviewService.close();
  this.expandDataSetPanel = false;
  this.dataSetPreview = false;
  this.dashboardExpandablePanelService.trigger('collapser');
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
    'UiScrollSource',
    'dashboardDataSetListService',
    'dashboardDataSetSearchService',
    'dashboardDataSetReloadService',
    'dashboardWidthFixerService',
    'dashboardExpandablePanelService',
    'dashboardDataSetPreviewService',
    DashboardCtrl
  ]);
