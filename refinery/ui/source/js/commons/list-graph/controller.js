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
      // if (this.rootIds.length === 1) {
      //   this.rootIds = this.data[this.rootIds[0]].children;
      // }
      this.listGraph = new ListGraph(
        this.$visElement[0],
        this.data,
        this.rootIds,
        {
          columns: Math.round(this.width / 175),
          rows: Math.round(this.height / 36),
          iconPath: this.settings.iconPath,
          sortBy: 'precision',
          dispatcher: pubSub.trigger
        }
      );
    }.bind(this));
  }

  this.$rootScope.$on('dashboardVisNodeEnter', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph) {
      this.listGraph.trigger('d3ListGraphNodeEnter', [data.nodeUri]);
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeLeave', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph) {
      this.listGraph.trigger('d3ListGraphNodeLeave', [data.nodeUri]);
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeLock', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph) {
      this.listGraph.trigger('d3ListGraphNodeLock', [data.nodeUri]);
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeUnlock', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph) {
      this.listGraph.trigger('d3ListGraphNodeUnlock', [data.nodeUri]);
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeFocus', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph) {
      var termIds = [];
      for (var i = data.terms.length; i--;) {
        termIds.push(data.terms[i].term);
      }
      this.listGraph.trigger('d3ListGraphFocusNodes', {
        nodeIds: termIds,
        zoomOut: true
      });
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeBlur', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph) {
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
    if (this.listGraph) {
      this.listGraph.trigger('d3ListGraphNodeRoot', data);
    }
  }.bind(this));

  this.$rootScope.$on('dashboardVisNodeUnroot', function (event, data) {
    // List graph might not be ready yet when a user hovers over a data set form
    // the list of data sets.
    if (this.listGraph) {
      this.listGraph.trigger('d3ListGraphNodeUnroot', data);
    }
  }.bind(this));
}

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
