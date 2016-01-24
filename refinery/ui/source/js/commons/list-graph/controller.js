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
  this.$element = this.$($element);
  this.$rootScope = $rootScope;
  this.settings = listGraphSettings;
  this.$visElement = this.$element.find('.list-graph');

  this.width = this.$visElement.find('svg.base').width();
  this.height = this.$visElement.find('svg.base').height();

  if (this.graphData) {
    this.graphData.then(function (graphData) {
      this.data = graphData;
      // Causes bug but should be done.
      if (this.rootIds.length === 1) {
        this.rootIds = this.data[this.rootIds[0]].children;
      }
      this.listGraph = new ListGraph(
        this.$visElement[0],
        this.data,
        this.rootIds,
        {
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
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSets(this.data[data.id]),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeLeave', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeLeave', {
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSets(this.data[data.id]),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeLock', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeLock', {
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSets(this.data[data.id]),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeUnlock', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeUnlock', {
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSets(this.data[data.id]),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeRoot', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeRoot', {
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSets(this.data[data.id]),
        source: 'listGraph'
      }
    );
  }.bind(this));

  pubSub.on('d3ListGraphNodeUnroot', function (data) {
    this.$rootScope.$emit(
      'dashboardVisNodeUnroot', {
        nodeUri: data.id,
        dataSetIds: this.getAssociatedDataSets(this.data[data.id]),
        source: 'listGraph'
      }
    );
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
      console.log(data.depth);
      this.listGraph.trigger('d3ListGraphNodeRoot', {
        nodeIds: data.nodeUris,
        focusNextLevel: data.depth
      });
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeUnroot', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph && data.source !== 'listGraph') {
      this.listGraph.trigger('d3ListGraphNodeUnroot', {
        nodeIds: data.nodeUris,
        focusNextLevel: data.depth
      });
    }
  }.bind(this));
}

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
