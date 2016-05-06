'use strict';

/**
 * List graph constructor.
 *
 * @method  ListGraphCtrl
 * @author  Fritz Lekschas
 * @date    2016-05-06
 *
 * @param   {Object}  $element           Directive's root element.
 * @param   {Object}  $rootScope         Angular's root scope.
 * @param   {Object}  graph              Graph library.
 * @param   {Object}  listGraphSettings  Settings.
 * @param   {Object}  dataSet            DataSet service.
 * @param   {Object}  pubSub             PubSub service.
 * @param   {Object}  ListGraphVis       The list graph visualization.
 */
function ListGraphCtrl (
  $element, $rootScope, graph, listGraphSettings, dataSet, pubSub, ListGraphVis
) {
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
        }]
      });
    }.bind(this));
  }

  // List graph internal events that should be broadcasted.
  pubSub.on('d3ListGraphNodeEnter', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeEnter', {
        clone: data.clone,
        clonedFromUri: data.clonedFromId,
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSetsIds(
          this.graph[data.clone ? data.clonedFromId : data.id]
        ),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeLeave', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeLeave', {
        clone: data.clone,
        clonedFromUri: data.clonedFromId,
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSetsIds(
          this.graph[data.clone ? data.clonedFromId : data.id]
        ),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeLock', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeLock', {
        clone: data.clone,
        clonedFromUri: data.clonedFromId,
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSetsIds(
          this.graph[data.clone ? data.clonedFromId : data.id]
        ),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeUnlock', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeUnlock', {
        clone: data.clone,
        clonedFromUri: data.clonedFromId,
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSetsIds(
          this.graph[data.clone ? data.clonedFromId : data.id]
        ),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeLockChange', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeLockChange', {
        lock: {
          clone: data.lock.clone,
          clonedFromUri: data.lock.clonedFromId,
          nodeUri: data.lock.id,
          dataSetIds: this.getAssociatedDataSetsIds(
            this.graph[data.lock.clone ? data.lock.clonedFromId : data.lock.id]
          )
        },
        unlock: {
          clone: data.unlock.clone,
          clonedFromUri: data.unlock.clonedFromId,
          nodeUri: data.unlock.id,
          dataSetIds: this.getAssociatedDataSetsIds(
            this.graph[
              data.unlock.clone ? data.unlock.clonedFromId : data.unlock.id
              ]
          )
        },
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeRoot', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeRoot', {
        clone: data.clone,
        clonedFromUri: data.clonedFromId,
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSetsIds(
          this.graph[data.clone ? data.clonedFromId : data.id]
        ),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeUnroot', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeUnroot', {
        clone: data.clone,
        clonedFromUri: data.clonedFromId,
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSetsIds(
          this.graph[data.clone ? data.clonedFromId : data.id]
        ),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeReroot', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeReroot', {
        clone: data.rooted.clone,
        clonedFromUri: data.rooted.clonedFromId,
        nodeUri: data.rooted.id,
        dataSetIds: this.getAssociatedDataSetsIds(
          this.graph[
            data.rooted.clone ? data.rooted.clonedFromId : data.rooted.id
            ]
        ),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeQuery', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeQuery', {
        clone: data.clone,
        clonedFromUri: data.clonedFromId,
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSetsIds(
          this.graph[data.clone ? data.clonedFromId : data.id]
        ),
        mode: data.mode,
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeUnquery', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeUnquery', {
        clone: data.clone,
        clonedFromUri: data.clonedFromId,
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSetsIds(
          this.graph[data.clone ? data.clonedFromId : data.id]
        ),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphBatchQuery', function (data) {
    var terms = [];

    for (var i = data.length; i--;) {
      terms.push({
        clone: data[i].data.clone,
        clonedFromUri: data[i].data.clonedFromId,
        nodeUri: data[i].data.id,
        dataSetIds: this.getAssociatedDataSetsIds(
          this.graph[
            data[i].data.clone ? data[i].data.clonedFromId : data[i].data.id
            ]
        ),
        mode: data[i].data.mode,
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
      uri = data.clone ? data.clonedFromId : data.id;
    }

    this.updatePrecisionRecall(Object.keys(this.graph[uri].dataSets));
    this.listGraph.trigger('d3ListGraphUpdateBars');
  }.bind(this));

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
      this.listGraph.trigger('d3ListGraphNodeRoot', {
        nodeIds: [data.nodeUri]
      });
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeUnroot', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph && data.source !== 'listGraph') {
      this.updatePrecisionRecall(Object.keys(this.graph[data.nodeUri].dataSets));
      this.listGraph.trigger('d3ListGraphNodeUnroot', {
        nodeIds: [data.nodeUri]
      });
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
    dataSet.ids.then(function (allIds) {
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
    'graph',
    'listGraphSettings',
    'dataSet',
    'pubSub',
    'ListGraphVis',
    ListGraphCtrl
  ]);
