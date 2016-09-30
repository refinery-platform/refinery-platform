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
      console.log('Nice! ' + self.id + ' finished!');
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
          '<span class="fa fa-info-circle"></span>.',
        position: 'bottom'
      },
      {
        element: '#data-set-panel',
        intro:
          'This is the data set view conisting of the search interface, the ' +
          'list of data sets, filter options, the data cart.',
        position: 'right'
      },
      {
        element: '#search-interface',
        intro:
        'The search interface starts querying as you type. Its design has ' +
        'been kept at a minimum.',
        position: 'right'
      },
      {
        element: '#data-set-panel-header',
        intro:
          'On the left you see the total number of data sets or results, and ' +
          'on the right you have a button to open the data cart, to filter ' +
          'and to sort data sets.</br><em>Note:</em> Sorting search results ' +
          'is not possible.',
        position: 'right'
      },
      {
        element: '#data-set-list',
        intro:
          'The list of data sets holds either all data sets or the results ' +
          'of a search or term query.</br>Each data set is represented by a ' +
          'small snippet showing the title, sharing information, etc.',
        position: 'right'
      },
      {
        element: '#exploration-view',
        intro:
          'This is the <em>exploration view</em> containing the two main ' +
          'visualizations for exploring the Refinery Platform',
        position: 'left'
      },
      {
        element: '#list-graph-wrapper',
        intro:
          'This is the node-link diagram.',
        position: 'left'
      },
      {
        element: '#treemap-wrapper',
        intro:
          'This is the treemap.',
        position: 'left'
      },
      {
        element: '#intro-js-satori-overview-start',
        intro:
          'This was a quick over. If you want to dive in deeper you can check' +
          'out the following guides that explain a bit more details: <ul>' +
          '<li class="clickable" onclick="introJsSatoriOverview' +
            '(\'satori-data-set-view\')">Data set list</li>' +
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
