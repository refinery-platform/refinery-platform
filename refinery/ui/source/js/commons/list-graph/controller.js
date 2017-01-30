'use strict';

/**
 * List graph constructor.
 *
 * @method  ListGraphCtrl
 * @author  Fritz Lekschas
 * @date    2016-08-31
 *
 * @param   {Object}  $element           Directive's root element.
 * @param   {Object}  $rootScope         Angular's root scope.
 * @param   {Object}  d3V4               D3.js version 4.x.
 * @param   {Object}  graph              Graph library.
 * @param   {Object}  listGraphSettings  Settings.
 * @param   {Object}  dataSet            DataSet service.
 * @param   {Object}  pubSub             PubSub service.
 * @param   {Object}  ListGraphVis       The list graph visualization.
 */
function ListGraphCtrl (
  $element,
  $rootScope,
  $timeout,
  d3V4,
  graph,
  listGraphSettings,
  dataSet,
  pubSub,
  ListGraphVis,
  dashboardVisWrapperResizer
) {
  var self = this;

  this.graphLib = graph;
  this.$element = $element;
  this.$rootScope = $rootScope;
  this.settings = listGraphSettings;
  this.$visElement = this.$element.find('.list-graph');

  this.width = this.$visElement.find('svg.base').width();
  this.height = this.$visElement.find('svg.base').height();

  if (this.graphData) {
    this.graphData.then(function (data) {
      this.graph = data.graph;
      this.rootIds = data.rootIds;
      if (this.rootIds.length === 1) {
        this.visRoots = this.graph[this.rootIds[0]].children;
      } else {
        this.visRoots = this.rootIds;
      }
      this.listGraph = new ListGraphVis({
        // Mandatory
        element: this.$visElement[0],
        data: this.graph,
        rootNodes: this.visRoots,
        iconPath: this.settings.iconPath,
        // Optional
        d3: d3V4,  // Can be removed once we use D3 v4 globally
        activeLevel: 1,
        columns: Math.round(this.width / 175),
        dispatcher: pubSub.trigger,
        hideOutwardsLinks: true,
        lessTransitions: 1,
        noRootActiveLevelDiff: 1,
        querying: true,
        rows: Math.round(this.height / 24),
        showLinkLocation: true,
        sortBy: 'precision',
        nodeInfoContextMenu: [{
          label: 'ID',
          property: function (_data) {
            return _data.ontId;
          }
        }, {
          label: 'URI',
          property: function (_data) {
            return _data.uri;
          }
        }],
        customTopbarButtons: this.customTopbarButtons || [],
        showTitle: true
      });
    }.bind(this));
  }

  dashboardVisWrapperResizer.onResize(function () {
    $timeout(function () {
      self.width = self.$visElement.find('svg.base').width();
      self.height = self.$visElement.find('svg.base').height();

      self.listGraph.reRender({
        grid: {
          columns: Math.round(self.width / 175),
          rows: Math.round(self.height / 24)
        }
      });
    }, 25);
  });

  // List graph internal events that should be broadcasted.
  pubSub.on('d3ListGraphNodeEnter', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeEnter', {
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSetsIds(this.graph[data.id]),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeLeave', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeLeave', {
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSetsIds(this.graph[data.id]),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeLock', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeLock', {
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSetsIds(this.graph[data.id]),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeUnlock', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeUnlock', {
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSetsIds(this.graph[data.id]),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeLockChange', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeLockChange', {
        lock: {
          nodeUri: data.lock.id,
          dataSetIds: this.getAssociatedDataSetsIds(this.graph[data.lock.id])
        },
        unlock: {
          nodeUri: data.unlock.id,
          dataSetIds: this.getAssociatedDataSetsIds(this.graph[data.unlock.id])
        },
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeRoot', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeRoot', {
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSetsIds(this.graph[data.id]),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeUnroot', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeUnroot', {
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSetsIds(this.graph[data.id]),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeReroot', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeReroot', {
        nodeUri: data.rooted.id,
        dataSetIds: this.getAssociatedDataSetsIds(this.graph[data.rooted.id]),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeQuery', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeQuery', {
        nodeUri: data.id,
        nodeLabel: data.name,
        dataSetIds: this.getAssociatedDataSetsIds(this.graph[data.id]),
        mode: data.mode,
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeUnquery', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeUnquery', {
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSetsIds(this.graph[data.id]),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphBatchQuery', function (data) {
    var terms = [];

    for (var i = data.length; i--;) {
      terms.push({
        nodeUri: data[i].data.id,
        nodeLabel: data[i].data.name,
        dataSetIds: this.getAssociatedDataSetsIds(this.graph[data[i].data.id]),
        mode: data[i].data.mode,
        root: data[i].data.root,
        query: data[i].name === 'd3ListGraphNodeQuery'
      });
    }

    this.$rootScope.$emit(
      'dashboardVisNodeToggleQuery', {
        terms: terms,
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphUpdateBarsRequest', function (data) {
    var uri = this.rootIds[0];

    if (data.id) {
      uri = data.id;
    }

    this.updatePrecisionRecall(Object.keys(this.graph[uri].dataSets));
    this.listGraph.trigger('d3ListGraphUpdateBars');
  }.bind(this));

  pubSub.on('resize', function () {
    $timeout(function () {
      self.width = self.$visElement.find('svg.base').width();
      self.height = self.$visElement.find('svg.base').height();

      self.listGraph.reRender({
        grid: {
          columns: Math.round(self.width / 175),
          rows: Math.round(self.height / 24)
        }
      });
    }, 25);
  });

  // External events that should be delegated to the list graph
  this.$rootScope.$on('dashboardVisSearch', function (event, data) {
    if (data.source !== 'listGraph') {
      this.updatePrecisionRecall(data.dsIds);
      if (this.listGraph) {
        this.listGraph.trigger('d3ListGraphUpdateBars');
      }
    }
  }.bind(this));

  // External events that should be delegated to the list graph
  this.$rootScope.$on('dashboardVisNodeEnter', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph && data.source !== 'listGraph') {
      this.listGraph.trigger('d3ListGraphNodeEnter', [data.nodeUri]);
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeLeave', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph && data.source !== 'listGraph') {
      this.listGraph.trigger('d3ListGraphNodeLeave', [data.nodeUri]);
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeLock', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph && data.source !== 'listGraph') {
      this.listGraph.trigger('d3ListGraphNodeLock', [data.nodeUri]);
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeUnlock', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph && data.source !== 'listGraph') {
      this.listGraph.trigger('d3ListGraphNodeUnlock', [data.nodeUri]);
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeFocus', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph && data.source !== 'listGraph') {
      var termIds = [];
      for (var i = data.terms.length; i--;) {
        termIds.push(data.terms[i].term);
      }
      this.listGraph.trigger('d3ListGraphFocusNodes', {
        nodeIds: termIds,
        zoomOut: !!data.zoomOut,
        hideUnrelatedNodes: !!data.hideUnrelatedNodes
      });
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeBlur', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph && data.source !== 'listGraph') {
      var termIds = [];
      for (var i = data.terms.length; i--;) {
        termIds.push(data.terms[i].term);
      }
      this.listGraph.trigger('d3ListGraphBlurNodes', {
        nodeIds: termIds,
        zoomIn: true
      });
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeRoot', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph && data.source !== 'listGraph' && !data.init) {
      this.updatePrecisionRecall(Object.keys(this.graph[data.nodeUri].dataSets));
      this.listGraph.trigger('d3ListGraphNodeRoot', [data.nodeUri]);
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeUnroot', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph && data.source !== 'listGraph') {
      this.updatePrecisionRecall(Object.keys(this.graph[data.nodeUri].dataSets));
      this.listGraph.trigger('d3ListGraphNodeUnroot', [data.nodeUri]);
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeQuery', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph && data.source !== 'listGraph' && !data.init) {
      this.updatePrecisionRecall(Object.keys(this.graph[data.nodeUri].dataSets));
      this.listGraph.trigger('d3ListGraphNodeQuery', {
        nodeIds: [data.nodeUri],
        mode: data.mode
      });
      this.listGraph.trigger('d3ListGraphUpdateBars');
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeUnquery', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph && data.source !== 'listGraph' && !data.init) {
      this.updatePrecisionRecall(Object.keys(this.graph[data.nodeUri].dataSets));
      this.listGraph.trigger('d3ListGraphNodeUnquery', {
        nodeIds: [data.nodeUri]
      });
      this.listGraph.trigger('d3ListGraphUpdateBars');
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisVisibleDepth', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph) {
      this.listGraph.trigger('d3ListGraphActiveLevel', data.visibleDepth);
    }
  }.bind(this));

  this.$rootScope.$on('dashboardDsSelected', function (event, data) {
    this.updatePrecisionRecall(data.ids);
    if (this.listGraph) {
      this.listGraph.trigger('d3ListGraphUpdateBars');
    }
  }.bind(this));

  this.$rootScope.$on('dashboardDsDeselected', function () {
    dataSet.allIds.then(function (allIds) {
      this.updatePrecisionRecall(allIds);
      if (this.listGraph) {
        this.listGraph.trigger('d3ListGraphUpdateBars');
      }
    }.bind(this));
  }.bind(this));
}

/**
 * Update precision recall
 *
 * @method  updatePrecisionRecall
 * @author  Fritz Lekschas
 * @date    2016-02-11
 * @param   {Object}  dsIds  Object list of data set IDs.
 */
ListGraphCtrl.prototype.updatePrecisionRecall = function (dsIds) {
  this.graphLib.calcPrecisionRecall(
    this.graph,
    this.valuePropertyName,
    dsIds
  );
  this.graphLib.updatePropertyToBar(this.graph, ['precision', 'recall']);
};

/**
 * Collect data set IDs associated with a given ontology term.
 *
 * @method  getAssociatedDataSetsIds
 * @author  Fritz Lekschas
 * @date    2016-02-11
 * @param   {Object}  term  Ontology term represented by a node object.
 * @return  {Object}        Object list of data set IDs.
 */
ListGraphCtrl.prototype.getAssociatedDataSetsIds = function (term) {
  var dataSetIds = {};

  /**
   * Recursively collecting dataset IDs to an object passed by reference.
   *
   * @method  collectIds
   * @author  Fritz Lekschas
   * @date    2015-10-14
   *
   * @param   {Object}  termData    Data associated to the term.
   */
  function collectIds (_term) {
    var i;
    var keys;

    if (_term.dataSets) {
      keys = Object.keys(_term.dataSets);
      for (i = keys.length; i--;) {
        dataSetIds[keys[i]] = true;
      }
    }

    if (_term.childRefs) {
      for (i = _term.childRefs.length; i--;) {
        collectIds(_term.childRefs[i]);
      }
    }
  }

  collectIds(term);

  return dataSetIds;
};


angular
  .module('listGraph')
  .controller('ListGraphCtrl', [
    '$element',
    '$rootScope',
    '$timeout',
    'd3V4',
    'graph',
    'listGraphSettings',
    'dataSet',
    'pubSub',
    'ListGraphVis',
    'dashboardVisWrapperResizer',
    ListGraphCtrl
  ]);
