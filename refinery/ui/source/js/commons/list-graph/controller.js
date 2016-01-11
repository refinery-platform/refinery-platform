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
function ListGraphCtrl ($element, $, graph, listGraphSettings, dataSet) {
  this.$ = $;
  this.$element = this.$($element);
  this.settings = listGraphSettings;
  this.$visElement = this.$element.find('.list-graph');

  this.width = this.$visElement.find('svg.base').width();
  this.height = this.$visElement.find('svg.base').height();

  if (this.graphData) {
    this.graphData.then(function (graphData) {
      this.data = graphData;
      this.listGraph = new ListGraph(
        this.$visElement[0],
        this.data,
        this.rootIds,
        {
          columns: Math.round(this.width / 175),
          rows: Math.round(this.height / 36),
          iconPath: this.settings.iconPath
        }
      );
    }.bind(this));
  }
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
    '$',
    'graph',
    'listGraphSettings',
    'dataSet',
    ListGraphCtrl
  ]);
