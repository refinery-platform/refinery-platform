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
      that.dataSets.resetCache();
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

  this.dataSetsSorting = settings.dashboard.dataSetsSorting;
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

Object.defineProperty(
  DashboardCtrl.prototype,
  'dataSetsFilterOwner', {
    enumerable: true,
    configurable: false,
    get: function () {
      return this._dataSetsFilterOwner;
    },
    set: function (value) {
      this._dataSetsFilterOwner = value;
      if (value) {
        this.dataSets.extraParameters['is_owner'] = 'True';
      } else {
        delete this.dataSets.extraParameters['is_owner'];
      }
      this.dataSets.newOrCachedCache(undefined, true);
      this.dashboardDataSetReloadService.reload();
      this.checkFilterSort();
    }
});

Object.defineProperty(
  DashboardCtrl.prototype,
  'dataSetsFilterPublic', {
    enumerable: true,
    configurable: false,
    get: function () {
      return this._dataSetsFilterPublic;
    },
    set: function (value) {
      this._dataSetsFilterPublic = value;
      if (value) {
        this.dataSets.extraParameters['public'] = 'True';
      } else {
        delete this.dataSets.extraParameters['public'];
      }
      this.dataSets.newOrCachedCache(undefined, true);
      this.dashboardDataSetReloadService.reload();
      this.checkFilterSort();
    }
});

Object.defineProperty(
  DashboardCtrl.prototype,
  'dataSetsSortBy', {
    enumerable: true,
    configurable: false,
    get: function () {
      return this._dataSetsSortBy;
    },
    set: function (value) {
      this._dataSetsSortBy = value;
      this.dataSetsSortOrder = 0;
      this.dataSetsSortDesc = false;

      this.triggerDataSetSorting();
      this.checkFilterSort();
    }
});

DashboardCtrl.prototype.checkFilterSort = function () {
  if (this.dataSetsFilterOwner) {
    this.dataSetsFilterSort = true;
    return;
  }
  if (this.dataSetsFilterPublic) {
    this.dataSetsFilterSort = true;
    return;
  }
  if (this.dataSetsSortBy) {
    this.dataSetsFilterSort = true;
    return;
  }
  this.dataSetsFilterSort = false;
};

DashboardCtrl.prototype.triggerDataSetSorting = function () {
  if (this.dataSetsSortBy) {
    this.dataSets.extraParameters['order_by'] = this.dataSetsSortDesc ?
      '-' + this.dataSetsSortBy : this.dataSetsSortBy;
  } else {
    delete this.dataSets.extraParameters['order_by'];
  }

  this.dataSets.newOrCachedCache(undefined, true);
  this.dashboardDataSetReloadService.reload();
};

DashboardCtrl.prototype.toggleSortOrder = function (sortBy) {
  this.dataSetsSortOrder = (this.dataSetsSortOrder + 1) % 3;

  if (this.dataSetsSortOrder === 0) {
    this.dataSetsSortBy = undefined;
  }

  if (this.dataSetsSortOrder === 2) {
    this.dataSetsSortDesc = true;
    this.triggerDataSetSorting();
  }
};

DashboardCtrl.prototype.getDataSetOptions = function () {
  this.dataSets
    .get(1, 1, function () {})
    .then(function (data) {
      this.dataSetOptions = Object.keys(data[0]);
    }.bind(this));
};

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

  this.showFilterSort = false;

  if (searchQuery) {
    if (searchQuery.length > 1) {
      that.searchDataSet = true;
      var searchResults = new this.dashboardDataSetSearchService(searchQuery);
      this.dataSets.set(searchResults, searchQuery);
      that.dashboardDataSetReloadService.reload();
    }
  } else {
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
