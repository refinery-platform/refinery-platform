'use strict';

function DashboardCtrl (
  // Angular modules
  $q,
  $state,
  $stateParams,
  $timeout,
  $rootScope,
  $window,
  $log,
  $sce,
  $compile,
  $scope,
  // 3rd party library
  _,
  $uibModal,
  // Refinery modules
  pubSub,
  settings,
  dataSet,
  authService,
  groupService,
  projectService,
  analysisService,
  workflowService,
  UiScrollSource,
  dashboardDataSetsReloadService,
  dashboardWidthFixerService,
  dashboardExpandablePanelService,
  dashboardDataSetPreviewService,
  treemapContext,
  dashboardVisData,
  dataCart,
  DashboardIntrosSatoriOverview,
  DashboardIntrosDataSetView,
  dashboardIntroSatoriEasterEgg,
  dashboardVisQueryTerms
) {
  var that = this;

  // Construct Angular modules
  this.$q = $q;
  this.$rootScope = $rootScope;
  this.$state = $state;
  this.$stateParams = $stateParams;
  this.$timeout = $timeout;
  this.$window = $window;
  this.$uibModal = $uibModal;
  this.$log = $log;

  // Construct 3rd party library
  this._ = _;
  this.$uibModal = $uibModal;

  // Construct Refinery modules
  this.pubSub = pubSub;
  this.settings = settings;
  this.dataSet = dataSet;
  this.authService = authService;
  this.groupService = groupService;
  this.projectService = projectService;
  this.analysisService = analysisService;
  this.workflowService = workflowService;
  this.dashboardDataSetsReloadService = dashboardDataSetsReloadService;
  this.dashboardWidthFixerService = dashboardWidthFixerService;
  this.dashboardExpandablePanelService = dashboardExpandablePanelService;
  this.dashboardDataSetPreviewService = dashboardDataSetPreviewService;
  this.treemapContext = treemapContext;
  this.dashboardVisData = dashboardVisData;
  this.dataCart = dataCart;
  this.introsSatoriOverview = new DashboardIntrosSatoriOverview();
  this.introsSatoriDataSetView = new DashboardIntrosDataSetView(this);
  this.queryTerms = dashboardVisQueryTerms;

  // variable to track filters and sorting selected in ui for data set api query
  this.dataSetParams = {};

  this.searchQueryDataSets = '';

  this.repoMode = !!this.settings.djangoApp.repositoryMode;

  // Construct class variables
  this.dataSetServiceLoading = false;
  this.expandedDataSetPanelBorder = false;

  this.dataSetsPanelHeight = 1;
  this.dataCartPanelHeight = 0;

  this.initVis = this.$q.defer();
  this.treemapContext.set('initVis', this.initVis.promise);
  this.icons = this.$window.getStaticUrl('images/icons.svg');

  // Check authentication
  // This should ideally be moved to the global APP controller, which we don't
  // have right now.
  this.authService.isAuthenticated().then(function (isAuthenticated) {
    this.userIsAuthenticated = isAuthenticated;
  }.bind(this));
  this.authService.isAdmin().then(function (isAdmin) {
    this.userIsAdmin = isAdmin;
  }.bind(this));

  this.authService.getUserId().then(function (userId) {
    this.userId = userId;
  }.bind(this));

  dashboardIntroSatoriEasterEgg.celebrate(
    this.openSatoriIntroEasterEgg.bind(this)
  );

  // Set up dataSets for `uiScroll`
  this.dataSets = new UiScrollSource(
    'dashboard/dataSets',
    10,
    this.dataSet.fetchInclMeta
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
    }.bind(this),
    'objects',
    'total_count'
  );

  this._dataSetsFilterGroup = null;
  this.membership = [];

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
    }.bind(this),
    'objects',
    'total_count'
  );

  this.searchDataSets = this._.debounce(
    this.setDataSetSource,
    settings.debounceSearch
  ).bind(this);

  // Set reloader
  this.dashboardDataSetsReloadService.setReload(function (hardReset) {
    if (hardReset) {
      this.dataSets.resetCache();
      this.dataSet.clearCache();
    }
    // Reset current list and reload uiScroll
    if (this.dataSetsAdapter) {
      this.dataSetsAdapter.reload();
    }
  }.bind(this));

  // This is a pseudo service just to have consistent naming with
  // `dashboardDataSetsReloadService`.
  this.dashboardAnalysesReloadService = {
    reload: function (hardReset) {
      if (hardReset) {
        this.analyses.resetCache();
      }
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
        this.setDataSetSource(toParams.q, true);
      }
      // Need to implement a method for finding a dataset by UUID first. The
      // reason why is that we need to link to the specific dataset object
      // which originates form the ui-scroll resource service.
      if (toState.name === 'launchPad.preview') {
        // Need to wait another digestion cycle to ensure the layout is set
        // properly.
        $timeout(function () {
          this.expandDataSetPreview(toParams.uuid, true);
        }.bind(this), 0);
      }
      if (toState.name === 'launchPad') {
        if (this.expandDataSetPanel) {
          $timeout(function () {
            this.collapseDataSetPreview();
            this.collapseDatasetExploration();
          }.bind(this), 0);
        }
      }
      if (toState.name === 'launchPad.exploration') {
        if (toParams.context) {
          var depth = parseInt(toParams.visibleDepth, 10);
          depth = depth > 0 ? depth : 1;

          this.treemapRoot = {
            branchId: toParams.branchId ? toParams.branchId : 0,
            ontId: toParams.context,
            visibleDepth: depth
          };
          this.initVis.resolve({
            ontId: toParams.context,
            visibleDepth: depth
          });
        }
        // Need to wait another digestion cycle to ensure the layout is set
        // properly.
        this.$timeout(function () {
          this.expandDatasetExploration(true);
        }.bind(this), 0);
      }
    }.bind(this), 0);
  }.bind(this));

  this.analysesSorting = settings.dashboard.analysesSorting;
  this.dataSetsSorting = settings.dashboard.dataSetsSorting;
  this.workflowsSorting = settings.dashboard.workflowsSorting;

  pubSub.on('resize', function () {
    if (this.dataSetsAdapter) this.dataSetsAdapter.reload();
    if (this.analysesAdapter) this.analysesAdapter.reload();
    if (this.workflowsAdapter) this.workflowsAdapter.reload();
  }.bind(this));

  this.treemapContext.on('root', function (root) {
    this.$state.transitionTo(
      this.$state.current,
      {
        context: root ? root.ontId : null,
        branchId: root ? root.branchId : null
      },
      {
        inherit: true,
        notify: false
      }
    );
  }.bind(this));

  this.queryRelatedDataSets = {};

  this.treemapContext.on('dataSets', function (response) {
    this.$q.when(response).then(function (dataSets) {
      this.selectDataSets(dataSets);
    }.bind(this));
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeEnter', function (event, data) {
    this.dataSet.highlight(data.dataSetIds, false, 'hover');
    this.$rootScope.$digest();
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeLeave', function (event, data) {
    this.dataSet.highlight(data.dataSetIds, true, 'hover');
    this.$rootScope.$digest();
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeLock', function (event, data) {
    this.dataSet.highlight(data.dataSetIds, false, 'lock');
    this.$rootScope.$digest();
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeUnlock', function (event, data) {
    this.dataSet.highlight(data.dataSetIds, true, 'lock');
    this.$rootScope.$digest();
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeLockChange', function (event, data) {
    this.dataSet.highlight(data.unlock.dataSetIds, true, 'lock');
    this.dataSet.highlight(data.lock.dataSetIds, false, 'lock');
    this.$rootScope.$digest();
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeToggleQuery', function (event, data) {
    var uri;

    for (var i = data.terms.length; i--;) {
      uri = this.getOriginalUri(data.terms[i]);

      if (data.terms[i].query) {
        // 1. Update query terms
        if (!this.queryTerms.get(uri)) {
          this.queryTerms.set(uri, {
            uri: uri,
            label: data.terms[i].nodeLabel,
            dataSetIds: data.terms[i].dataSetIds
          });
        }
        this.queryTerms.setProp(uri, 'mode', data.terms[i].mode);
        this.queryTerms.setProp(uri, 'root', data.terms[i].root);
      } else {
        this.queryTerms.remove(uri);
      }
    }

    // Update data set selection
    if (this.queryTerms.length) {
      this.collectDataSetIds().then(function (dsIds) {
        this.selectDataSets(dsIds);
      }.bind(this));
    } else {
      this.deselectDataSets();
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeQuery', function (event, data) {
    var uri = this.getOriginalUri(data);

    // 1. Update query terms
    if (!this.queryTerms.get(uri)) {
      this.queryTerms.set(uri, {
        uri: uri,
        label: data.nodeLabel,
        dataSetIds: data.dataSetIds
      });
    }
    this.queryTerms.setProp(uri, 'mode', data.mode);

    // Update data set selection
    this.collectDataSetIds().then(function (dsIds) {
      this.selectDataSets(dsIds);
    }.bind(this));
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeUnquery', function (event, data) {
    var uri = this.getOriginalUri(data);

    this.queryTerms.remove(uri);

    if (this.queryTerms.length) {
      this.collectDataSetIds().then(function (dsIds) {
        this.selectDataSets(dsIds);
      }.bind(this));
    } else {
      this.deselectDataSets();
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisVisibleDepth', function (event, data) {
    this.$state.transitionTo(
      this.$state.current,
      {
        visibleDepth: data.visibleDepth || null
      },
      {
        inherit: true,
        notify: false
      }
    );
  }.bind(this));

  this.customRepoModeHtml = $sce.trustAsHtml(
    settings.djangoApp.repositoryModeHomePageHtml
  );

  function checkDomEl (times) {
    var el = document.querySelector('#custom-repo-mode-html');

    if (!el && times < 10) {
      this.$timeout(function () {
        checkDomEl.call(this, times + 1);
      }.bind(this), times * 5);
    } else {
      $compile(angular.element(el).contents())($scope);
    }
  }

  checkDomEl.call(this, 0);

  this.$timeout(function () {
    // Expand panel to full with
    if (this.repoMode) {
      this.expandDataSetPanel = true;
      this.expandedDataSetPanelBorder = true;
      this.dashboardWidthFixerService
        .fixWidth()
        .then(function () {
          this.dashboardExpandablePanelService.trigger('lockFullWith');
        }.bind(this))
        .catch(function () {
          // This is weird. We should never run into here unless the whole app
          // initialization failed even after 75ms.
          // See `services/width-fixer.js` for details.
          this.$log.error('Dashboard expand dataset exploration error,' +
            ' possibly due to the Refinery App failing to initialized.');
        }.bind(this));
    }
  }.bind(this), 0);

  this.pubSub.on('collapseFinished', function () {
    this.collapsing = false;
  }.bind(this));
}

/*
 * -----------------------------------------------------------------------------
 * Properties
 * -----------------------------------------------------------------------------
 */

Object.defineProperty(
  DashboardCtrl.prototype,
  'analysesFilterStatus', {
    enumerable: true,
    get: function () {
      return this._analysesFilterStatus;
    },
    set: function (value) {
      this.analysesFilterStatusCounter = 0;
      this._analysesFilterStatus = value;
      if (value) {
        this.analyses.extraParameters.status = value;
      } else {
        delete this.analyses.extraParameters.status;
      }
      this.analyses.newOrCachedCache(undefined, true);
      this.dashboardAnalysesReloadService.reload();
      this.checkAnalysesFilterSort();
    }
  });

Object.defineProperty(
  DashboardCtrl.prototype,
  'analysesIsFilterable', {
    enumerable: true,
    get: function () {
      if (!this._analysesIsFilterable && this.analyses.totalReadable) {
        this._analysesIsFilterable = true;
      }
      return this._analysesIsFilterable;
    }
  });

Object.defineProperty(
  DashboardCtrl.prototype,
  'analysesSortBy', {
    enumerable: true,
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
  'dataSetsFilterGroup', {
    enumerable: true,
    get: function () {
      return this._dataSetsFilterGroup;
    },
    set: function (value) {
      var groupId = value && value.group_id ? value.group_id : undefined;

      this._dataSetsFilterGroup = value;
      if (typeof groupId === 'number') {
        this.dataSetParams.group = groupId;
        this.dataSet.filter(this.dataSetParams);
      } else {
        // remove group property
        delete this.dataSetParams.group;
        this.dataSet.filter(this.dataSetParams);
      }
      this.dataSets.newOrCachedCache(undefined, true);
      this.dashboardDataSetsReloadService.reload();
      this.checkDataSetsFilter();
      this.checkAllCurrentDataSetsInDataCart();
    }
  });

Object.defineProperty(
  DashboardCtrl.prototype,
  'dataSetsFilterOwner', {
    enumerable: true,
    get: function () {
      return this._dataSetsFilterOwner;
    },
    set: function (value) {
      this._dataSetsFilterOwner = value;
      if (value) {
        this.dataSetParams.is_owner = 'True';
        this.dataSet.filter(this.dataSetParams);
      } else {
        // remove is_owner property, avoids searching for non-owned data sets
        delete this.dataSetParams.is_owner;
        this.dataSet.filter(this.dataSetParams);
      }
      this.dataSets.newOrCachedCache(undefined, true);
      this.dashboardDataSetsReloadService.reload();
      this.checkDataSetsFilter();
      this.checkAllCurrentDataSetsInDataCart();
    }
  });

Object.defineProperty(
  DashboardCtrl.prototype,
  'dataSetsFilterPublic', {
    enumerable: true,
    get: function () {
      return this._dataSetsFilterPublic;
    },
    set: function (value) {
      this._dataSetsFilterPublic = value;
      if (value) {
        this.dataSetParams.public = 'True';
        this.dataSet.filter(this.dataSetParams);
      } else {
         // remove is_owner property, avoids searching for non-public data sets
        delete this.dataSetParams.public;
        this.dataSet.filter(this.dataSetParams);
      }
      this.dataSets.newOrCachedCache(undefined, true);
      this.dashboardDataSetsReloadService.reload();
      this.checkDataSetsFilter();
      this.checkAllCurrentDataSetsInDataCart();
    }
  });

Object.defineProperty(
  DashboardCtrl.prototype,
  'dataSetsSortBy', {
    enumerable: true,
    get: function () {
      return this._dataSetsSortBy;
    },
    set: function (value) {
      this._dataSetsSortBy = value;
      this.dataSetsSortOrder = 0;
      this.dataSetsSortDesc = false;

      this.triggerSorting('dataSets');
      this.checkDataSetsSort();
    }
  });

Object.defineProperty(
  DashboardCtrl.prototype,
  'expandDataSetPanel', {
    enumerable: true,
    value: false,
    writable: true
  });

Object.defineProperty(
  DashboardCtrl.prototype,
  'explorationEnabled', {
    enumerable: true,
    get: function () {
      return this.settings.djangoApp.numOntologiesImported > 0;
    }
  });

Object.defineProperty(
  DashboardCtrl.prototype,
  'treemapRoot', {
    enumerable: true,
    get: function () {
      return this.treemapContext.get('root');
    },
    set: function (value) {
      this.treemapContext.set('root', value);
    }
  });

Object.defineProperty(
  DashboardCtrl.prototype,
  'visibleDataSets', {
    enumerable: true,
    get: function () {
      return this.dataSetsAdapter.visibleItems('uuid');
    }
  });

Object.defineProperty(
  DashboardCtrl.prototype,
  'workflowsSortBy', {
    enumerable: true,
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

/*
 * -----------------------------------------------------------------------------
 * Methods
 * -----------------------------------------------------------------------------
 */

/* ----------------------------------- A ------------------------------------ */

/**
 * Add a data set object to the data cart.
 *
 * @method  addToDataCart
 * @author  Fritz Lekschas
 * @date    2016-05-09
 * @param   {Object}  dataSet  Data set to be added
 */
DashboardCtrl.prototype.addToDataCart = function (dataSet) {
  this.dataCart.add(dataSet);
  this.checkAllCurrentDataSetsInDataCart();
};

/**
 * Add all currently viewed data sets to the data cart.
 *
 * @method  addAllCurrentToDataCart
 * @author  Fritz Lekschas
 * @date    2016-05-09
 */
DashboardCtrl.prototype.addAllCurrentToDataCart = function () {
  this.dataSet.ids.then(function (ids) {
    var promisedDataSets = [];
    for (var i = ids.length; i--;) {
      promisedDataSets.push(this.dataSet.get(ids[i]));
    }
    this.$q.all(promisedDataSets).then(function (dataSets) {
      this.dataCart.add(dataSets);
      this.allCurrentDataSetsInDataCart = 2;
    }.bind(this));
  }.bind(this));
};

/* ----------------------------------- C ------------------------------------ */

/**
 * Check all currently viewed data sets whether they have been added to the
 * data cart.
 *
 * @method  checkAllCurrentDataSetsInDataCart
 * @author  Fritz Lekschas
 * @date    2016-05-09
 */
DashboardCtrl.prototype.checkAllCurrentDataSetsInDataCart = function () {
  this.dataSet.allIds.then(function (allIds) {
    this.allCurrentDataSetsInDataCart = this.dataCart.added(allIds);
  }.bind(this));
};

/**
 * Check whether analyses are filtered or sorted.
 *
 * @method  checkAnalysesFilterSort
 * @author  Fritz Lekschas
 * @date    2016-05-09
 */
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

/**
 * Check whether data sets are filtered.
 *
 * @method  checkDataSetsFilter
 * @author  Fritz Lekschas
 * @date    2016-05-09
 */
DashboardCtrl.prototype.checkDataSetsFilter = function () {
  if (this.dataSetsFilterOwner) {
    this.dataSetsFilter = true;
    return;
  }
  if (this.dataSetsFilterPublic) {
    this.dataSetsFilter = true;
    return;
  }
  if (this.dataSetsFilterGroup) {
    this.dataSetsFilter = true;
    return;
  }
  this.dataSetsFilter = false;
};

/**
 * Check whether data sets are sorted.
 *
 * @method  checkDataSetsSort
 * @author  Fritz Lekschas
 * @date    2016-05-09
 */
DashboardCtrl.prototype.checkDataSetsSort = function () {
  if (this.dataSetsSortBy) {
    this.dataSetsSort = true;
    return;
  }
  this.dataSetsSort = false;
};

/**
 * Check whether workflows are filtered or sorted.
 *
 * @method  checkWorkflowsFilterSort
 * @author  Fritz Lekschas
 * @date    2016-05-09
 */
DashboardCtrl.prototype.checkWorkflowsFilterSort = function () {
  if (this.workflowsSortBy) {
    this.workflowsFilterSort = true;
    return;
  }
  this.workflowsFilterSort = false;
};

/**
 * Remove all data sets from the data cart and close the data cart if it is
 * opened.
 *
 * @method  clearDataCart
 * @author  Fritz Lekschas
 * @date    2016-05-09
 */
DashboardCtrl.prototype.clearDataCart = function () {
  this.dataCart.clear();
  this.allCurrentDataSetsInDataCart = 0;
  this.toggleDataCart(true);
};

/**
 * Close the data set exploration view.
 *
 * @method  collapseDatasetExploration
 * @author  Fritz Lekschas
 * @date    2016-05-09
 */
DashboardCtrl.prototype.collapseDatasetExploration = function () {
  if (this.dataSetExploration) {
    this.$state.transitionTo(
      'launchPad',
      {},
      {
        inherit: true,
        notify: false
      }
    );

    this.dataSetExploration = false;
    this.deselectDataSets();

    if (!this.repoMode) {
      this.expandDataSetPanel = false;
      this.dashboardExpandablePanelService.trigger('collapser');
    } else {
      this.pubSub.trigger('vis.hide');
    }

    this.dataSet.highlight(
      this.treemapContext.get('highlightedDataSets'), true
    );
  }
};

/**
 * Close the data set metadata preview view.
 *
 * @method  collapseDataSetPreview
 * @author  Fritz Lekschas
 * @date    2016-05-09
 */
DashboardCtrl.prototype.collapseDataSetPreview = function () {
  if (this.dataSetPreview) {
    if (this.dataSetExploration) {
      this.dataSetExplorationTempHidden = false;
      this.pubSub.trigger('vis.show');
    } else {
      this.$state.transitionTo(
        'launchPad',
        {},
        {
          inherit: true,
          notify: false
        }
      );

      if (!this.repoMode) {
        this.expandDataSetPanel = false;
        this.collapsing = true;
        this.dashboardExpandablePanelService.trigger('collapser');
      }
    }

    this.dataSetPreview = false;
    this.dashboardDataSetPreviewService.close();
  }
};

/**
 * Spread query terms by their query mode.
 *
 * @method  collectAndOrNotTerms
 * @author  Fritz Lekschas
 * @date    2016-05-09
 * @return  {Object}  Object of _and, _or_, and _not_ arrays of query terms.
 */
DashboardCtrl.prototype.collectAndOrNotTerms = function () {
  var termUris = this.queryTerms.keys;
  var andTerms = [];
  var orTerms = [];
  var notTerms = [];

  for (var i = termUris.length; i--;) {
    if (this.queryTerms.get(termUris[i]).mode === 'and') {
      andTerms.push(this.queryTerms.get(termUris[i]));
    } else if (this.queryTerms.get(termUris[i]).mode === 'or') {
      orTerms.push(this.queryTerms.get(termUris[i]));
    } else {
      notTerms.push(this.queryTerms.get(termUris[i]));
    }
  }

  return {
    andTerms: andTerms,
    orTerms: orTerms,
    notTerms: notTerms
  };
};

/**
 * Collect all data set IDs depending on the current ontology term querying.
 *
 * @method  collectDataSetIds
 * @author  Fritz Lekschas
 * @date    2016-05-09
 * @return  {Object}  Promise resolving to an array of data set IDs.
 */
DashboardCtrl.prototype.collectDataSetIds = function () {
  var deferred = this.$q.defer();
  var andOrNotTerms = this.collectAndOrNotTerms();
  var i;

  // Collection exclusions of all _NOTs_
  var notUnion = [];
  for (i = andOrNotTerms.notTerms.length; i--;) {
    notUnion = this._.union(
      notUnion,
      Object.keys(andOrNotTerms.notTerms[i].dataSetIds)
    );
  }

  // Collection intersection of all _ANDs_
  var andIntersection = [];
  for (i = andOrNotTerms.andTerms.length; i--;) {
    if (i === andOrNotTerms.andTerms.length - 1) {
      andIntersection = Object.keys(andOrNotTerms.andTerms[i].dataSetIds);
    } else {
      andIntersection = this._.intersection(
        andIntersection,
        Object.keys(andOrNotTerms.andTerms[i].dataSetIds)
      );
    }
  }

  // Collection union of all _ORs_
  var orUnion = [];
  for (i = andOrNotTerms.orTerms.length; i--;) {
    orUnion = this._.union(
      orUnion,
      Object.keys(andOrNotTerms.orTerms[i].dataSetIds)
    );
  }
  // Final intersection of intersection of _ANDs_ with union of all _ORs_
  var allDsIds = orUnion;
  if (andIntersection.length && !orUnion.length) {
    allDsIds = andIntersection;
  }
  if (andIntersection.length && orUnion.length) {
    allDsIds = this._.intersection(allDsIds, andIntersection);
  }

  // In case only **nots** are available
  if (!andIntersection.length && !orUnion.length) {
    allDsIds = this.dataSet.allIds;
  } else {
    allDsIds = this.$q.when(allDsIds);
  }

  allDsIds.then(function (allIds) {
    var allNormalizedIds = allIds;
    if (allIds.length && this._.isFinite(allIds[0])) {
      allNormalizedIds = this._.map(allIds, function (el) {
        return el.toString();
      });
    }
    if (notUnion.length) {
      deferred.resolve(this._.difference(allNormalizedIds, notUnion));
    } else {
      deferred.resolve(allDsIds);
    }
  }.bind(this));

  return deferred.promise;
};

/* ----------------------------------- D ------------------------------------ */

/**
 * Checks whether the current data set is previewed by UUID.
 *
 * @method  dataSetIsPreviewed
 * @author  Fritz Lekschas
 * @date    2016-05-09
 * @param   {String}   uuid  Data set UUID to be checked
 * @return  {Boolean}        If `true` the data set is currently previewed.
 */
DashboardCtrl.prototype.dataSetIsPreviewed = function (uuid) {
  return this.dashboardDataSetPreviewService.dataSetUuid === uuid;
};

/**
 * Mouse enter exploration related user interaction helper method.
 *
 * @method  dataSetMouseEnter
 * @author  Fritz Lekschas
 * @date    2016-05-09
 * @param   {Object}  dataSet  Data set being hovered.
 */
DashboardCtrl.prototype.dataSetMouseEnter = function (dataSet) {
  this.$rootScope.$emit('dashboardVisNodeFocus', {
    terms: dataSet.annotations || [],
    source: 'resultsList'
  });
  if (this.listGraphHideUnrelatedNodes !== dataSet.id) {
    this.listGraphHideUnrelatedNodes = undefined;
  }
};

/**
 * Mouse leave exploration related user interaction helper method.
 *
 * @method  dataSetMouseLeave
 * @author  Fritz Lekschas
 * @date    2016-05-09
 * @param   {Object}  dataSet  Data set being left.
 */
DashboardCtrl.prototype.dataSetMouseLeave = function (dataSet) {
  this.$rootScope.$emit('dashboardVisNodeBlur', {
    terms: dataSet.annotations || [],
    source: 'resultsList'
  });
  this.listGraphHideUnrelatedNodes = undefined;
  this.listGraphZoomedOut = false;
};

/**
 * Deselect currently selected data sets.
 *
 * @method  deselectDataSets
 * @author  Fritz Lekschas
 * @date    2016-05-09
 */
DashboardCtrl.prototype.deselectDataSets = function () {
  this.dataSet.deselect();
  this.dataSets.newOrCachedCache();
  this.$timeout(function () {
    this.dashboardDataSetsReloadService.reload();
  }.bind(this), 0);

  this.checkAllCurrentDataSetsInDataCart();
  this.$rootScope.$emit('dashboardDsDeselected');
};

/* ----------------------------------- E ------------------------------------ */

/**
 * Open the data set exploration view.
 *
 * @method  expandDatasetExploration
 * @author  Fritz Lekschas
 * @date    2016-05-09
 * @param   {Object}  fromStateEvent  UI-router previous state object.
 */
DashboardCtrl.prototype.expandDatasetExploration = function (fromStateEvent) {
  var that = this;

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

  if (!this.expandDataSetPanel) {
    this.dashboardWidthFixerService
      .fixWidth()
      .then(function () {
        that.expandDataSetPanel = true;
        that.expandedDataSetPanelBorder = true;
        that.dashboardExpandablePanelService.trigger('expander');
      })
      .catch(function () {
        // This is weird. We should never run into here unless the whole app
        // initialization failed even after 75ms.
        // See `services/width-fixer.js` for details.
        this.$log.error('Dashboard expand dataset exploration error,' +
          ' possibly due to the Refinery App failing to initialized.');
      });
  } else {
    this.$timeout(function () {
      this.pubSub.trigger('vis.show');
    }.bind(this), 0);
  }
};

/**
 * Open data set metadata preview view.
 *
 * @method  expandDataSetPreview
 * @author  Fritz Lekschas
 * @date    2016-05-09
 * @param   {String}  dataSetUuid     Data set UUID to be previewed.
 * @param   {Object}  fromStateEvent  UI-router previous state object.
 */
DashboardCtrl.prototype.expandDataSetPreview = function (
  dataSetUuid, fromStateEvent
) {
  var that = this;

  if (this.dataSetExploration) {
    this.dataSetExplorationTempHidden = true;
    this.pubSub.trigger('vis.tempHide');
  } else {
    if (!fromStateEvent) {
      this.$state.transitionTo(
        'launchPad.preview',
        {
          uuid: dataSetUuid
        },
        {
          inherit: true,
          notify: false
        }
      );
    }
  }

  function startExpansion () {
    if (!this.expandDataSetPanel) {
      this.dashboardWidthFixerService
        .fixWidth()
        .then(function () {
          that.expandDataSetPanel = true;
          that.expandedDataSetPanelBorder = true;
          that.dashboardExpandablePanelService.trigger('expander');
        })
        .catch(function () {
          // This is weird. We should never run into here unless the whole app
          // initialization failed even after 75ms.
          // See `services/width-fixer.js` for details.
          this.$log.error('Dashboard expand dataset exploration error,' +
          ' possibly due to the Refinery App failing to initialized.');
        });
    }
    this.dashboardDataSetPreviewService.preview(dataSetUuid);
    this.dataSetPreview = true;
  }

  if (!this.dashboardDataSetPreviewService.previewing) {
    if (this.collapsing) {
      // Panel is currently being collapsed so we need to wait until the
      // animation is done because the width fixer needs to capture the
      // collapsed panel's width.
      this.pubSub.on('collapseFinished', function () {
        this.$timeout(startExpansion.bind(this), 0);
      }.bind(this), 1);
    } else {
      startExpansion.apply(this);
    }
  } else {
    if (this.dataSetIsPreviewed(dataSetUuid)) {
      this.collapseDataSetPreview();
    } else {
      this.dashboardDataSetPreviewService.preview(dataSetUuid);
    }
  }
};

/* ----------------------------------- G ------------------------------------ */

/**
 * Two-way data-binding data cart panel height method.
 *
 * @description
 * This is a hack as Angular doesn't like two-way data binding for primitives
 *
 * @method  getDataCartPanelHeight
 * @author  Fritz Lekschas
 * @date    2016-05-09
 * @return  {Number}  Data cart panel height in pixel.
 */
DashboardCtrl.prototype.getDataCartPanelHeight = function () {
  return this.dataCartPanelHeight;
};

/**
 * Two-way data-binding data set panel height method.
 *
 * @description
 * This is a hack as Angular doesn't like two-way data binding for primitives
 *
 * @method  getDataSetsPanelHeight
 * @author  Fritz Lekschas
 * @date    2016-05-09
 * @return  {Number}  Data set panel height in pixel.
 */
DashboardCtrl.prototype.getDataSetsPanelHeight = function () {
  return this.dataSetsPanelHeight;
};

/**
 * Get the original URI of a term.
 *
 * @description
 * Normalizes across different clones.
 *
 * @method  getOriginalUri
 * @author  Fritz Lekschas
 * @date    2016-05-09
 * @param   {Object}  eventData  Event data.
 * @return  {String}             Original URI.
 */
DashboardCtrl.prototype.getOriginalUri = function (eventData) {
  return eventData.nodeUri;
};

/* ----------------------------------- R ------------------------------------ */

/**
 * Turns an unreadable date into a readable date string.
 *
 * @method  readableDate
 * @author  Fritz Lekschas & Scott Ouellette
 * @date    2016-09-30
 * @param   {Object}  dataObj  DataSet or Analysis object of interest.
 * @param   {String}  property  Name of the date property to be made readable.
 * @return  {String}            Readable date string.
 */
DashboardCtrl.prototype.readableDate = function (dataObj, property) {
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
    'Sep', 'Oct', 'Nov', 'Dec'];

  if (property === 'modification_date') {
    // Analyses' modification_date field is not a date string that Safari
    // can handle so we need to convert it.
    // https://stackoverflow.com/a/6427318
    var dateParts = dataObj[property].toString().split(/[^0-9]/);
    dataObj[property] = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
  }
  if (dataObj[property] && !dataObj[property + 'Readable']) {
    dataObj[property + 'Readable'] =
      months[dataObj[property].getMonth()] + ' ' +
      dataObj[property].getDate() + ', ' +
      dataObj[property].getFullYear();
  }
  return dataObj[property + 'Readable'];
};

/**
 * Remove all currently viewed data sets from the data cart
 *
 * @method  removeAllCurrentToDataCart
 * @author  Fritz Lekschas
 * @date    2016-05-09
 */
DashboardCtrl.prototype.removeAllCurrentToDataCart = function () {
  this.dataSet.allIds.then(function (allIds) {
    this.dataCart.remove(allIds, true);
    this.allCurrentDataSetsInDataCart = 0;
  }.bind(this));
};

/**
 * Wrapper method to remove a data set from the data cart.
 *
 * @method  removeFromDataCart
 * @author  Fritz Lekschas
 * @date    2016-05-09
 * @param   {Object}  dataSet  Data set to be removed.
 */
DashboardCtrl.prototype.removeFromDataCart = function (dataSet) {
  this.dataCart.remove(dataSet);
  this.checkAllCurrentDataSetsInDataCart();
};

/**
 * Unset current data set search query.
 *
 * @method  resetDataSetSearch
 * @author  Fritz Lekschas
 * @date    2016-05-09
 */
DashboardCtrl.prototype.resetDataSetSearch = function (noStateChange) {
  this.searchQueryDataSets = '';
  this.setDataSetSource(undefined, noStateChange);
};

/* ----------------------------------- S ------------------------------------ */

/**
 * Select a number of data sets.
 *
 * @description
 * Selecting a data set means filtering out all unselected data sets from the
 * currently viewed list of data set.
 *
 * @method  selectDataSets
 * @author  Fritz Lekschas
 * @date    2016-05-09
 * @param   {Object|Array}  ids  Object-list or array of data set IDs to be
 *   selected.
 */
DashboardCtrl.prototype.selectDataSets = function (ids) {
  var queryTermUris = this.queryTerms.keys;
  var query = this.treemapRoot.ontId;

  if (queryTermUris && queryTermUris.length) {
    query = '';
    for (var i = queryTermUris.length; i--;) {
      query += (
        queryTermUris[i] +
        '.' +
        this.queryTerms.get(queryTermUris[i]).mode +
        '+'
      );
    }
    // Remove last `+`
    query = query.slice(0, -1);
  }

  this.dataSet.select(ids, query);
  this.dataSets.newOrCachedCache(
    'selection.' + query
  );
  this.$timeout(function () {
    this.dashboardDataSetsReloadService.reload();
  }.bind(this), 0);

  this.$rootScope.$emit('dashboardDsSelected', {
    ids: ids
  });
  this.checkAllCurrentDataSetsInDataCart();
};

/**
 * Sets a new data source for the infinite scroll directive.
 *
 * @description
 * This method triggers the data set search.
 *
 * @method  setDataSetSource
 * @author  Fritz Lekschas
 * @date    2016-05-09
 * @param   {String}  searchQuery     Search string.
 * @param   {Object}  fromStateEvent  UI-router previous state object.
 */
DashboardCtrl.prototype.setDataSetSource = function (
  searchQuery,
  fromStateEvent
) {
  this.showFilterSort = false;

  if (!fromStateEvent) {
    var stateChange = this.$state.go(
      '.',
      {
        q: searchQuery || null
      }
    );

    stateChange.then(function () {
      // ! HACK !
      // Currently state changes do not trigger a controller reload, hence no
      // `$stateChangeSuccess` is triggered. Without triggering this event the
      // root controller doesn't recognize any changes of the query parameter.
      // If we inform the root controller and trigger the event the template
      // will be refreshed, which causes an ugly usability bug in which the
      // search input is deselected for a short moment and preventing from
      // typing further...
      this.$rootScope.$emit(
        '$reloadlessStateChangeSuccess', this.$state.current
      );
    }.bind(this));
  }

  if (searchQuery) {
    if (searchQuery.length > 1) {
      if (this.queryTerms.length && !this.oldTotalDs) {
        this.oldTotalDs = this.dataSets.totalReadable;
      }

      this.searchDataSet = true;
      var annotations = this.dataSet
        .search(searchQuery)
        .getCurrentAnnotations();
      this.dataSets.newOrCachedCache(searchQuery);
      // Sometimes the `ui-scroll` didn't stop showing the loading spinner. It
      // seems like we need to wait for one digestion cycle before reloading the
      // directive.
      this.$timeout(function () {
        this.dashboardDataSetsReloadService.reload();
      }.bind(this), 0);

      this.dashboardVisData.updateGraph(annotations);
    }
  } else {
    this.oldTotalDs = undefined;

    this.dataSet.all();

    var browseState = this.dataSet.getCurrentBrowseState();

    if (
      browseState &&
      browseState.type === 'select' &&
      this._.isString(browseState.query)
    ) {
      browseState = 'selection.' + browseState.query;
    }

    this.dataSets.newOrCachedCache(browseState);
    this.searchDataSet = false;
    this.dashboardDataSetsReloadService.reload();

    this.dataSet.allIds.then(function (allDsIds) {
      this.$rootScope.$emit('dashboardVisSearch', {
        dsIds: allDsIds,
        source: 'dashboard'
      });
    }.bind(this));
  }
  this.checkAllCurrentDataSetsInDataCart();
};

/**
 * Checks whether a data set notification should be shown.
 *
 * @method  showNotification
 * @author  Fritz Lekschas
 * @date    2016-05-09
 */
DashboardCtrl.prototype.showNotification = function () {
  return (
    this.dataSets.error ||
    this.dataSets.total === 0 ||
    this.searchQueryDataSets.length === 1 || (
      this.searchQueryDataSets.length > 1 && this.dataSets.total === 0
    )
  );
};

/**
 * Checks whether the upload button should be shown.
 *
 * @method  showUploadButton
 * @author  Fritz Lekschas
 * @date    2016-05-09
 */
DashboardCtrl.prototype.showUploadButton = function () {
  if (!this.userIsAuthenticated) {
    return false;
  }
  if (this.repoMode && !this.userIsAdmin) {
    return false;
  }
  return true;
};

/* ----------------------------------- T ------------------------------------ */

/**
 * Toggle visibility of the data cart.
 *
 * @method  toggleDataCart
 * @author  Fritz Lekschas
 * @date    2016-05-09
 * @param   {Boolean}  forceClose  If `true` force closes the data cart.
 */
DashboardCtrl.prototype.toggleDataCart = function (forceClose) {
  if (this.dataCart.length || forceClose) {
    if (this.showDataCart || forceClose) {
      this.dataSetsPanelHeight = 1;
      this.dataCartPanelHeight = 0;
    } else {
      this.dataSetsPanelHeight = 0.75;
      this.dataCartPanelHeight = 0.25;
    }

    this.showDataCart = forceClose ? false : !!!this.showDataCart;

    this.pubSub.trigger('refineryPanelUpdateHeight', {
      ids: {
        dataCart: true,
        dataSets: true
      }
    });

    this.$timeout(function () {
      // Reload dataSet infinite scroll adapter
      if (this.dataSetsAdapter) {
        this.dataSetsAdapter.reload();
      }
    }.bind(this), 250);
  }
};

/**
 * Toggle visibility of the data set filter panel.
 *
 * @method  toggleDataSetsFilter
 * @author  Fritz Lekschas
 * @date    2016-05-09
 */
DashboardCtrl.prototype.toggleDataSetsFilter = function () {
  this.showDataSetsFilter = !!!this.showDataSetsFilter;
  if (!this.membershipLoaded) {
    this.groupService.query()
      .$promise
      .then(function (response) {
        var tmp = [];
        // This extra loop is necessary because we don't want to provide two
        // filter options to only show public data.
        for (var i = response.objects.length; i--;) {
          if (response.objects[i].group_id !== 100) {
            tmp.push(response.objects[i]);
          }
        }
        tmp.sort(function sortByName (a, b) {
          var aName = a.group_name.toLowerCase();
          var bName = b.group_name.toLowerCase();
          if (aName < bName) {
            return -1;
          }
          if (aName > bName) {
            return 1;
          }
          return 0;
        });
        this.membership = tmp;
      }.bind(this))
      .finally(function () {
        this.membershipLoaded = true;
      }.bind(this));
  }
};

/**
 * Toggles the visibility of the data set exploration view.
 *
 * @method  toggleDataSetsExploration
 * @author  Fritz Lekschas
 * @date    2016-05-09
 */
DashboardCtrl.prototype.toggleDataSetsExploration = function () {
  this.dataSetPreview = false;
  this.dashboardDataSetPreviewService.close();

  if (this.dataSetExploration && this.expandDataSetPanel) {
    this.collapseDatasetExploration();
  } else {
    this.expandDatasetExploration();
  }
};

/**
 * Toggles through zoomed in or zoomed out state of the list graph view.
 *
 * @method  toggleListGraphZoom
 * @author  Fritz Lekschas
 * @date    2016-05-09
 * @param   {Object}  dataSet  Data set that is currently being interacted with
 *   in the data set list that triggered this action.
 */
DashboardCtrl.prototype.toggleListGraphZoom = function (dataSet) {
  if (this.listGraphZoomedOut) {
    this.$rootScope.$emit('dashboardVisNodeFocus', {
      terms: dataSet.annotations,
      source: 'resultsList',
      hideUnrelatedNodes: this.listGraphHideUnrelatedNodes === dataSet.id
    });
  } else {
    this.$rootScope.$emit('dashboardVisNodeFocus', {
      terms: dataSet.annotations,
      zoomOut: true,
      source: 'resultsList',
      hideUnrelatedNodes: this.listGraphHideUnrelatedNodes === dataSet.id
    });
  }
  this.listGraphZoomedOut = !!!this.listGraphZoomedOut;
};

/**
 * Toggle the visibility of unrelated annotation terms given a certain data set.
 *
 * @method  toggleListUnrelatedNodes
 * @author  Fritz Lekschas
 * @date    2016-05-09
 * @param   {Object}  dataSet  Data set of interest, which is currently
 *   interacted with.
 */
DashboardCtrl.prototype.toggleListUnrelatedNodes = function (dataSet) {
  if (this.listGraphHideUnrelatedNodes === dataSet.id) {
    this.$rootScope.$emit('dashboardVisNodeFocus', {
      terms: dataSet.annotations,
      source: 'resultsList',
      zoomOut: this.listGraphZoomedOut
    });
    this.listGraphHideUnrelatedNodes = undefined;
  } else {
    this.$rootScope.$emit('dashboardVisNodeFocus', {
      terms: dataSet.annotations,
      source: 'resultsList',
      zoomOut: this.listGraphZoomedOut,
      hideUnrelatedNodes: true
    });
    this.listGraphHideUnrelatedNodes = dataSet.id;
  }
};

/**
 * Toggle analyses filter radio button.
 *
 * @method  toogleRadio
 * @author  Fritz Lekschas
 * @date    2016-05-09
 */
DashboardCtrl.prototype.toogleRadio = function () {
  if (this.analysesFilterStatusCounter++) {
    this.analysesFilterStatus = undefined;
  }
};

/**
 * Toggle through the sort order.
 *
 * @method  toggleSortOrder
 * @author  Fritz Lekschas
 * @date    2016-05-09
 * @param   {String}  source  Source that this relates to, e.g. 'dataSets',
 *   'analyses', or 'workflows'.
 */
DashboardCtrl.prototype.toggleSortOrder = function (source) {
  var sortBy = source + 'SortBy';
  var sortDesc = source + 'SortDesc';
  var sortOrder = source + 'SortOrder';

  this[sortOrder] = (this[sortOrder] + 1) % 3;

  if (this[sortOrder] === 0) {
    this[sortBy] = undefined;
  }

  if (this[sortOrder] === 2) {
    this[sortDesc] = true;
    this.triggerSorting(source);
  }
};


/**
 * Trigger sorting of data sets, analyses, or workflows.
 *
 * @method  triggerSorting
 * @author  Fritz Lekschas
 * @date    2016-05-09
 * @param   {String}  source  Name of the source, e.g. 'dataSets', 'analyses',
 *   or 'workflows'.
 */
DashboardCtrl.prototype.triggerSorting = function (source) {
  var sortBy = source + 'SortBy';
  var sortDesc = source + 'SortDesc';
  var reloadService = (
  'dashboard' +
    source.charAt(0).toUpperCase() +
    source.slice(1) +
    'ReloadService'
  );

  if (this[sortBy]) {
    var params = this[sortDesc] ? '-' + this[sortBy] : this[sortBy];
    // Todo: Unify data sources. Currently datasets are handled nicely and
    // more generic than others e.g. analyses and workflows.
    if (source === 'dataSets') {
      // Use api request params to tie in sorting & filtering
      this.dataSetParams.order_by = params;
      this.dataSet.filter(this.dataSetParams);
    } else {
      this[source].extraParameters.order_by = params;
    }
  } else {
    if (source === 'dataSets') {
      // Remove order_by param from api request params
      delete this.dataSetParams.order_by;
      this.dataSet.filter(this.dataSetParams);
    } else {
      delete this[source].extraParameters.order_by;
    }
  }

  this[source].newOrCachedCache(undefined, true);
  this[reloadService].reload();
};

/**
 * Open easter egg congratulation dialog
 *
 * @method  openSatoriIntroEasterEgg
 * @author  Fritz Lekschas
 * @date    2015-08-21
 */
DashboardCtrl.prototype.openSatoriIntroEasterEgg = function () {
  this.$uibModal.open({
    templateUrl: this.$window.getStaticUrl(
      '/static/partials/dashboard/partials/intro-satori-easteregg.html'
    ),
    controller: 'IntroSatoriEasterEggCtrl as modal'
  });
};

/*
 * Open the deletion modal for a given Datset.
 *
 * @method  openDataSetDeleteModal
 * @author  Scott Ouellette
 * @date    2016-9-20
 */
DashboardCtrl.prototype.openDataSetDeleteModal = function (dataSet) {
  this.collapseDataSetPreview();
  this.collapseDatasetExploration();
  this.removeFromDataCart(dataSet);
  var datasetDeleteDialogUrl = this.$window.getStaticUrl(
    'partials/dashboard/partials/dataset-delete-dialog.html'
  );

  this.$uibModal.open({
    backdrop: 'static',
    keyboard: false,
    templateUrl: datasetDeleteDialogUrl,
    controller: 'DataSetDeleteCtrl as modal',
    resolve: {
      config: function () {
        return {
          model: 'data_sets',
          uuid: dataSet.uuid
        };
      },
      dataSet: dataSet,
      dataSets: this.dataSets,
      analyses: this.analyses,
      analysesReloadService: this.dashboardAnalysesReloadService
    }
  });
};

/**
 * Open the deletion modal for a given Analysis.
 *
 * @method  openAnalysisDeleteModal
 * @author  Scott Ouellette
 * @date    2016-9-28
 */
DashboardCtrl.prototype.openAnalysisDeleteModal = function (analysis) {
  var analysisDeleteDialogUrl = this.$window.getStaticUrl(
    'partials/dashboard/partials/analysis-delete-dialog.html'
  );
  this.$uibModal.open({
    backdrop: 'static',
    keyboard: false,
    templateUrl: analysisDeleteDialogUrl,
    controller: 'AnalysisDeleteCtrl as modal',
    resolve: {
      config: function () {
        return {
          model: 'analyses',
          uuid: analysis.uuid
        };
      },
      analysis: analysis,
      analyses: this.analyses,
      dataSets: this.dataSets,
      analysesReloadService: this.dashboardAnalysesReloadService,
      isOwner: analysis.is_owner
    }
  });
};

DashboardCtrl.prototype.openFileBrowserDisabled = function () {
  this.$uibModal.open({
    templateUrl: this.$window.getStaticUrl(
      '/static/partials/dashboard/partials/file-browser-disabled.html'
    ),
    controller: 'IntroSatoriEasterEggCtrl as modal'
  });
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
    '$log',
    '$sce',
    '$compile',
    '$scope',
    '_',
    '$uibModal',
    'pubSub',
    'settings',
    'dataSet',
    'authService',
    'groupService',
    'projectService',
    'analysisService',
    'workflowService',
    'UiScrollSource',
    'dashboardDataSetsReloadService',
    'dashboardWidthFixerService',
    'dashboardExpandablePanelService',
    'dashboardDataSetPreviewService',
    'treemapContext',
    'dashboardVisData',
    'dataCart',
    'DashboardIntrosSatoriOverview',
    'DashboardIntrosDataSetView',
    'dashboardIntroSatoriEasterEgg',
    'dashboardVisQueryTerms',
    DashboardCtrl
  ]);
