'use strict';

function DashboardIntrosSatoriOverview (
  introJsDefaultOptions,
  introJsBeforeChangeEvent,
  dashboardIntroStarter,
  dashboardIntroSatoriEasterEgg
) {
  /**
   * Constructor
   *
   * @method  Intros
   * @author  Fritz Lekschas
   * @date    2016-09-16
   */
  function Intros () {
    var self = this;

    self.id = 'satori-overview';

    self.clickHandler = function (id) {
      self.complete();
      self._exit();
      dashboardIntroStarter.start(id);
    };

    self.autoStart = false;

    self.start = function () {
      document.introJsSatoriOverview = self.clickHandler;

      // Call the start method of Intro.js
      self._start();
    };

    dashboardIntroStarter.register(self.id, self.start);
    dashboardIntroSatoriEasterEgg.register(self.id);

    self.complete = function () {
      dashboardIntroSatoriEasterEgg.completed(self.id);
      self.exit();
    };

    self.exit = function () {
      document.introJsSatoriOverview = null;
    };

    self.beforeChangeEvent = introJsBeforeChangeEvent();

    self.options = angular.copy(introJsDefaultOptions);
    self.options.steps = [
      {
        element: '#intro-js-satori-overview-start',
        intro:
          'This is a quick introduction to the main interfaces of SATORI.</br>' +
          '</br>More are specific guides are available as well. Look for ' +
          '<span class="fa fa-info-circle"></span>.</br></br>Click on the ' +
          'arrow buttons below or use the arrow keys to navigate.',
        position: 'bottom'
      },
      {
        element: '#data-set-panel',
        intro:
          'This is the data set view conisting of the search interface, the ' +
          'list of data sets, filter options, the data cart.<br/><br/>' +
          '<em class="clickable" onclick="introJsSatoriOverview' +
            '(\'satori-data-set-view\')">Jump to the data set view intro</em>',
        position: 'right'
      },
      {
        element: '#exploration-view',
        intro:
          'This is the <em>exploration view</em> containing the two main ' +
          'visualizations for exploration and the query term list.',
        position: 'left'
      },
      {
        element: '#list-graph-wrapper',
        intro:
          'This is the node-link diagram. It shows the condensed graph of ' +
          'ontology classes that are used for annotation of the data sets on ' +
          'the left.<br/><br/>' +
          '<em class="clickable" onclick="introJsSatoriOverview' +
            '(\'satori-list-graph\')">Jump to the list graph intro</em>',
        position: 'left'
      },
      {
        element: '#treemap-wrapper',
        intro:
          'This is the treemap visualization, which shows the relative ' +
          'number of times each of the ontology classes is used for ' +
          'annotation.<br/><br/>' +
          '<em class="clickable" onclick="introJsSatoriOverview' +
            '(\'satori-treemap\')">Jump to the treemap intro</em>',
        position: 'left'
      },
      {
        element: '#query-terms',
        intro:
          'This panel shows all active query terms (e.g., a cell type). ' +
          'Together with the search bar on the left it provides a holistic ' +
          'overview of all queries.<br/><br/>Query terms are added through ' +
          'interaction with the two visualizations but can be easily ' +
          'modified and removed. In the future it will be possible to ' +
          'directly search for ontological query terms in the search bar.',
        position: 'left'
      },
      {
        element: '#intro-js-satori-overview-start',
        intro:
          'That was a quick overview. The following guides go into more detail: <ul>' +
          '<li class="clickable" onclick="introJsSatoriOverview' +
            '(\'satori-data-set-view\')">Data set view</li>' +
          '<li class="clickable" onclick="introJsSatoriOverview' +
            '(\'satori-list-graph\')">List graph visualization</li>' +
          '<li class="clickable" onclick="introJsSatoriOverview' +
            '(\'satori-treemap\')">Tree map visualization</li>' +
          '<li class="clickable" onclick="introJsSatoriOverview' +
            '(\'satori-data-set-summary\')">Data set summary</li>' +
          '</ul>',
        position: 'left'
      }
    ];
  }

  return Intros;
}

angular
  .module('refineryDashboard')
  .factory('DashboardIntrosSatoriOverview', [
    'introJsDefaultOptions',
    'introJsBeforeChangeEvent',
    'dashboardIntroStarter',
    'dashboardIntroSatoriEasterEgg',
    DashboardIntrosSatoriOverview
  ]);
