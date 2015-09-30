function DashboardCtrl (
  // Angular modules
  $q,
  $state,
  $stateParams,
  $timeout,
  $rootScope,
  $window,
  // 3rd party library
  _,
  // Refinery modules
  pubSub,
  settings,
  authService,
  projectService,
  analysisService,
  workflowService,
  UiScrollSource,
  dashboardDataSetListService,
  dashboardDataSetSearchService,
  dashboardDataSetsReloadService,
  dashboardWidthFixerService,
  dashboardExpandablePanelService,
  dashboardDataSetPreviewService) {
  var that = this;

  // Construct Angular modules
  this.$q = $q;
  this.$state = $state;
  this.$stateParams = $stateParams;
  this.$timeout = $timeout;
  this.$window = $window;

  // Construct 3rd party library
  this._ = _;

  // Construct Refinery modules
  this.authService = authService;
  this.projectService = projectService;
  this.analysisService = analysisService;
  this.workflowService = workflowService;
  this.dashboardDataSetListService = dashboardDataSetListService;
  this.dashboardDataSetSearchService = dashboardDataSetSearchService;
  this.dashboardDataSetsReloadService = dashboardDataSetsReloadService;
  this.dashboardWidthFixerService = dashboardWidthFixerService;
  this.dashboardExpandablePanelService = dashboardExpandablePanelService;
  this.dashboardDataSetPreviewService = dashboardDataSetPreviewService;

  // Construct class variables
  this.dataSetServiceLoading = false;
  this.expandedDataSetPanelBorder = false;

  // --! HACKY !--
  this.adminMail = $window.refineryAdminMail;

  // Check authentication
  // This should ideally be moved to the global APP controller, which we don't
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
    function (limit, offset, extra) {
      var params = this._.merge(this._.cloneDeep(extra) || {}, {
            limit: limit,
            offset: offset
          });

      return this.analysisService.query(params).$promise;
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
    function (limit, offset, extra) {
      var params = this._.merge(this._.cloneDeep(extra) || {}, {
            limit: limit,
            offset: offset
          });

      return this.workflowService.query(params).$promise;
    }.bind(this)
  );

  this.searchDataSets = this._.debounce(
    this.setDataSetSource,
    settings.debounceSearch
  ).bind(this);

  // Set reloader
  this.dashboardDataSetsReloadService.setReload(function (hardReset) {
    if (hardReset) {
      this.dataSets.resetCache();
    }
    // Reset current list and reload uiScroll
    if (this.dataSetsAdapter) {
      this.dataSetsAdapter.reload();
    }
  }.bind(this));

  // This is a pseudo service just to have consistent naming with
  // `dashboardDataSetsReloadService`.
  this.dashboardAnalysesReloadService = {
    reload: function () {
      if (that.analysesAdapter) {
        that.analysesAdapter.reload();
      }
    }
  };

  // This is a pseudo service just to have consistent naming with
  // `dashboardDataSetsReloadService`.
  this.dashboardWorkflowsReloadService = {
    reload: function () {
      if (that.workflowsAdapter) {
        that.workflowsAdapter.reload();
      }
    }
  };

  this.dashboardWidthFixerService.resetter.push(function () {
    this.expandedDataSetPanelBorder = false;
  }.bind(this));

  $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams) {
    // We have to wait until the first digestion cycle has finished to make sure
    // that all listeners etc. are set up correctly.
    // `$timeout(function () {}, 0);` is equals one digestion cycle.
    $timeout(function () {
      $window.sizing();
      if (toParams.q) {
        this.searchQueryDataSets = toParams.q;
        this.setDataSetSource(toParams.q);
      }
      // Need to implement a method for finding a dataset by uuid first. The
      // reason why is that we need to link to the specific dataset object
      // which originates form the ui-scroll resource service.
      // if (toState.name === 'launchPad.preview') {
      //   // Need to wait another digestion cycle to ensure the layout is set
      //   // properly.
      //   $timeout(function () {
      //     this.showDataSetPreview(this.findDataSet(toParams.uuid), true);
      //   }.bind(this), 0);
      // }
      if (toState.name === 'launchPad') {
        $timeout(function () {
          this.collapseDataSetPreview();
          this.collapseDatasetExploration();
        }.bind(this), 0);
      }
      if (toState.name === 'launchPad.exploration') {
        // Need to wait another digestion cycle to ensure the layout is set
        // properly.
        $timeout(function () {
          this.expandDatasetExploration(true);
        }.bind(this), 0);
      }
    }.bind(this), 0);
  }.bind(this));

  this.analysesSorting = settings.dashboard.analysesSorting;
  this.dataSetsSorting = settings.dashboard.dataSetsSorting;
  this.workflowsSorting = settings.dashboard.workflowsSorting;

  pubSub.on('resize', function () {
    this.dataSetsAdapter.reload();
    this.analysesAdapter.reload();
    this.workflowsAdapter.reload();
  }.bind(this));
}

/*
 * -----------------------------------------------------------------------------
 * Define prototype
 * -----------------------------------------------------------------------------
 */
Object.defineProperty(
  DashboardCtrl.prototype,
  'visibleDataSets', {
    enumerable: true,
    configurable: false,
    get: function () {
      return this.dataSetsAdapter.visibleItems('uuid');
    }
});

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
  'analysesIsFilterable', {
    enumerable: true,
    configurable: false,
    get: function () {
      if (!this._analysesIsFilterable && this.analyses.totalReadable) {
        this._analysesIsFilterable = true;
      }
      return this._analysesIsFilterable;
    }
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
      this.dashboardDataSetsReloadService.reload();
      this.checkDataSetsFilterSort();
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
      this.dashboardDataSetsReloadService.reload();
      this.checkDataSetsFilterSort();
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

      this.triggerSorting('dataSets');
      this.checkDataSetsFilterSort();
    }
});

Object.defineProperty(
  DashboardCtrl.prototype,
  'analysesFilterStatus', {
    enumerable: true,
    configurable: false,
    get: function () {
      return this._analysesFilterStatus;
    },
    set: function (value) {
      this.analysesFilterStatusCounter = 0;
      this._analysesFilterStatus = value;
      if (value) {
        this.analyses.extraParameters['status'] = value;
      } else {
        delete this.analyses.extraParameters['status'];
      }
      this.analyses.newOrCachedCache(undefined, true);
      this.dashboardAnalysesReloadService.reload();
      this.checkAnalysesFilterSort();
    }
});

Object.defineProperty(
  DashboardCtrl.prototype,
  'analysesSortBy', {
    enumerable: true,
    configurable: false,
    get: function () {
      return this._analysesSortBy;
    },
    set: function (value) {
      this._analysesSortBy = value;
      this.analysesSortOrder = 0;
      this.analysesSortDesc = false;

      this.triggerSorting('analyses');
      this.checkAnalysesFilterSort();
    }
});

Object.defineProperty(
  DashboardCtrl.prototype,
  'workflowsSortBy', {
    enumerable: true,
    configurable: false,
    get: function () {
      return this._workflowsSortBy;
    },
    set: function (value) {
      this._workflowsSortBy = value;
      this.workflowsSortOrder = 0;
      this.workflowsSortDesc = false;

      this.triggerSorting('workflows');
      this.checkWorkflowsFilterSort();
    }
});

DashboardCtrl.prototype.toogleRadio = function () {
  if (this['analysesFilterStatusCounter']++) {
    this['analysesFilterStatus'] = undefined;
  }
};

DashboardCtrl.prototype.checkAnalysesFilterSort = function () {
  if (this.analysesFilterStatus) {
    this.analysesFilterSort = true;
    return;
  }
  if (this.analysesSortBy) {
    this.analysesFilterSort = true;
    return;
  }
  this.analysesFilterSort = false;
};

DashboardCtrl.prototype.checkDataSetsFilterSort = function () {
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

DashboardCtrl.prototype.checkWorkflowsFilterSort = function () {
  if (this.workflowsSortBy) {
    this.workflowsFilterSort = true;
    return;
  }
  this.workflowsFilterSort = false;
};

DashboardCtrl.prototype.triggerSorting = function (source) {
  var sortBy = source + 'SortBy',
      sortDesc = source + 'SortDesc',
      reloadService = 'dashboard' + source.charAt(0).toUpperCase() + source.slice(1) + 'ReloadService';

  if (this[sortBy]) {
    this[source].extraParameters['order_by'] = this[sortDesc] ?
      '-' + this[sortBy] : this[sortBy];
  } else {
    delete this[source].extraParameters['order_by'];
  }

  this[source].newOrCachedCache(undefined, true);
  this[reloadService].reload();
};

DashboardCtrl.prototype.toggleSortOrder = function (source) {
  var sortBy = source + 'SortBy',
      sortDesc = source + 'SortDesc',
      sortOrder = source + 'SortOrder';

  this[sortOrder] = (this[sortOrder] + 1) % 3;

  if (this[sortOrder] === 0) {
    this[sortBy] = undefined;
  }

  if (this[sortOrder] === 2) {
    this[sortDesc] = true;
    this.triggerSorting(source);
  }
};

DashboardCtrl.prototype.getDataSetOptions = function () {
  this.dataSets
    .get(1, 1, function () {})
    .then(function (data) {
      this.dataSetOptions = Object.keys(data[0]);
    }.bind(this));
};

DashboardCtrl.prototype.resetDataSetSearch = function () {
  this.searchQueryDataSets = '';
  this.setDataSetSource();
};

DashboardCtrl.prototype.setDataSetSource = function (searchQuery) {
  var that = this;

  this.showFilterSort = false;

  this.$state.transitionTo(
    this.$state.current,
    {
      q: searchQuery ? searchQuery : null
    },
    {
      inherit: true,
      notify: false
    }
  );

  if (searchQuery) {
    if (searchQuery.length > 1) {
      that.searchDataSet = true;
      var searchResults = new this.dashboardDataSetSearchService(searchQuery);
      this.dataSets.set(searchResults, searchQuery);
      that.dashboardDataSetsReloadService.reload();
    }
  } else {
    this.dataSets.set(this.dashboardDataSetListService);
    if (that.searchDataSet) {
      that.searchDataSet = false;
      that.dashboardDataSetsReloadService.reload();
    }
  }
};

DashboardCtrl.prototype.showDataSetPreview = function (dataSet, fromStateEvent) {
  this.dataSetExploration = false;

  if (!fromStateEvent) {
    this.$state.transitionTo(
      'launchPad.preview',
      {
        uuid: dataSet.uuid
      },
      {
        inherit: true,
        notify: false
      }
    );
  }

  if (!this.dashboardDataSetPreviewService.previewing) {
    if (!this.expandDataSetPanel) {
      this.expandDataSetPanel = true;
      this.expandedDataSetPanelBorder = true;
      this.dashboardWidthFixerService.trigger('fixer');
      this.dashboardExpandablePanelService.trigger('expander');
    }
    this.dashboardDataSetPreviewService.preview(dataSet);
    this.dataSetPreview = true;
  } else {
    if (dataSet.preview) {
      this.collapseDataSetPreview(dataSet);
    } else {
      this.dashboardDataSetPreviewService.preview(dataSet);
    }
  }
};

DashboardCtrl.prototype.collapseDataSetPreview = function (dataSet) {
  this.$state.transitionTo(
    'launchPad',
    {},
    {
      inherit: true,
      notify: false
    }
  );

  this.dashboardDataSetPreviewService.close();
  this.expandDataSetPanel = false;
  this.dataSetPreview = false;
  this.dashboardExpandablePanelService.trigger('collapser');
};

DashboardCtrl.prototype.toggleDataSetsExploration = function () {
  this.dataSetPreview = false;
  if (this.expandDataSetPanel) {
    this.collapseDatasetExploration();
  } else {
    this.expandDatasetExploration();
  }
};

DashboardCtrl.prototype.expandDatasetExploration = function (fromStateEvent) {
  if (!fromStateEvent) {
    this.$state.transitionTo(
      'launchPad.exploration',
      {},
      {
        inherit: true,
        notify: false
      }
    );
  }

  this.dataSetExploration = true;
  this.expandDataSetPanel = true;
  this.expandedDataSetPanelBorder = true;
  this.dashboardWidthFixerService.trigger('fixer');
  this.dashboardExpandablePanelService.trigger('expander');
};

DashboardCtrl.prototype.collapseDatasetExploration = function () {
  this.$state.transitionTo(
    'launchPad',
    {},
    {
      inherit: true,
      notify: false
    }
  );

  this.dataSetExploration = false;
  this.expandDataSetPanel = false;
  this.dashboardExpandablePanelService.trigger('collapser');
};

DashboardCtrl.prototype.findDataSet = function (uuid) {
  // Need to implement a method that can find an item in a ui-scroll resource.
};

angular
  .module('refineryDashboard')
  .controller('DashboardCtrl', [
    '$q',
    '$state',
    '$stateParams',
    '$timeout',
    '$rootScope',
    '$window',
    '_',
    'pubSub',
    'settings',
    'authService',
    'projectService',
    'analysisService',
    'workflowService',
    'UiScrollSource',
    'dashboardDataSetListService',
    'dashboardDataSetSearchService',
    'dashboardDataSetsReloadService',
    'dashboardWidthFixerService',
    'dashboardExpandablePanelService',
    'dashboardDataSetPreviewService',
    DashboardCtrl
  ]);
