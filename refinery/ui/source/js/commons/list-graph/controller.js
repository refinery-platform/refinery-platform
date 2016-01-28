/**
 * List graph constructor.
 *
 * @method  ListGraphCtrl
 * @author  Fritz Lekschas
 * @date    2015-12-22
 *
 * @param   {Object}  $element           Directive's root element.
 * @param   {Object}  $                  jQuery.
 * @param   {Object}  graph              Graph library.
 * @param   {Object}  listGraphSettings  Settings.
 * @param   {Object}  pubSub             PubSub service.
 */
function ListGraphCtrl (
  $element, $rootScope, $, graph, listGraphSettings, dataSet, pubSub,
  treemapContext
) {
  this.$ = $;
  this.graphLib = graph;
  this.$element = this.$($element);
  this.$rootScope = $rootScope;
  this.settings = listGraphSettings;
  this.$visElement = this.$element.find('.list-graph');

  this.width = this.$visElement.find('svg.base').width();
  this.height = this.$visElement.find('svg.base').height();

  if (this.graphData) {
    this.graphData.then(function (data) {
      this.graph = data.graph;
      this.rootIds = data.rootIds;
      // Causes bug but should be done.
      if (this.rootIds.length === 1) {
        this.visRoots = this.graph[this.rootIds[0]].children;
      } else {
        this.visRoots = this.rootIds;
      }
      this.listGraph = new ListGraph(
        this.$visElement[0],
        this.graph,
        this.visRoots,
        {
          activeLevelNumber: 1,
          noRootedNodeDifference: 1,
          columns: Math.round(this.width / 175),
          rows: Math.round(this.height / 36),
          iconPath: this.settings.iconPath,
          lessAnimations: true,
          sortBy: 'precision',
          dispatcher: pubSub.trigger
        }
      );
    }.bind(this));
  }

  // List graph internal events that should be broadcasted.
  pubSub.on('d3ListGraphNodeEnter', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeEnter', {
        clone: data.clone,
        clonedFromUri: data.clonedFromId,
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSets(
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
        dataSetIds: this.getAssociatedDataSets(
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
        dataSetIds: this.getAssociatedDataSets(
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
        dataSetIds: this.getAssociatedDataSets(
          this.graph[data.clone ? data.clonedFromId : data.id]
        ),
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
        dataSetIds: this.getAssociatedDataSets(
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
        dataSetIds: this.getAssociatedDataSets(
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
        dataSetIds: this.getAssociatedDataSets(
          this.graph[
            data.rooted.clone ? data.rooted.clonedFromId : data.rooted.id
          ]
        ),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphUpdateBarsRequest', function (data) {
    var uri = this.rootIds[0];

    if (data.id) {
      uri = data.clone ? data.clonedFromId : data.id;
    }

    this.updatePrecisionRecall(this.graph[uri]);
    this.listGraph.trigger('d3ListGraphUpdateBars');
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
        zoomOut: !!data.zoomOut
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
    if (this.listGraph && data.source !== 'listGraph') {
      this.updatePrecisionRecall(this.graph[data.nodeUri]);
      this.listGraph.trigger('d3ListGraphNodeRoot', {
        nodeIds: [data.nodeUri]
      });
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeUnroot', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph && data.source !== 'listGraph') {
      this.updatePrecisionRecall(this.graph[data.nodeUri]);
      this.listGraph.trigger('d3ListGraphNodeUnroot', {
        nodeIds: [data.nodeUri]
      });
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisVisibleDepth', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph) {
      this.listGraph.trigger('d3ListGraphActiveLevel', data);
    }
  }.bind(this));
}

ListGraphCtrl.prototype.updatePrecisionRecall = function (rootNode) {
  this.graphLib.updatePrecisionRecall(
    this.graph,
    this.valuePropertyName,
    Object.keys(rootNode.dataSets).length
  );
  this.graphLib.updatePropertyToBar(this.graph, ['precision', 'recall']);
};

ListGraphCtrl.prototype.getAssociatedDataSets = function (node) {
  var dataSetIds = {};

  /**
   * Recursively collecting dataset IDs to an object passed by reference.
   *
   * @method  collectIds
   * @author  Fritz Lekschas
   * @date    2015-10-14
   *
   * @param   {Object}  node        Data associated to the node.
   * @param   {Object}  dataSetIds  Object of boolean keys representing the
   *   dataset IDs.
   */
  function collectIds (node, dataSetIds) {
    var i, keys;

    if (node.dataSets) {
      keys = Object.keys(node.dataSets);
      for (i = keys.length; i--;) {
        dataSetIds[keys[i]] = true;
      }
    }

    if (node.childRefs) {
      for (i = node.childRefs.length; i--;) {
        collectIds(node.childRefs[i], dataSetIds);
      }
    }
  }

  collectIds(node, dataSetIds);

  return dataSetIds;
};

/*
 * -----------------------------------------------------------------------------
 * Methods
 * -----------------------------------------------------------------------------
 */


angular
  .module('listGraph')
  .controller('ListGraphCtrl', [
    '$element',
    '$rootScope',
    '$',
    'graph',
    'listGraphSettings',
    'dataSet',
    'pubSub',
    'treemapContext',
    ListGraphCtrl
  ]);
