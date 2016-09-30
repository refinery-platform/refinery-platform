'use strict';

function DashboardIntrosDataSetSummary (
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

    self.id = 'satori-data-set-summary';

    self.clickHandler = function (id) {
      self.complete();
      self._exit();
      dashboardIntroStarter.start(id);
    };

    self.start = function () {
      document.introJsSatoriTreemap = self.clickHandler;

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
      document.introJsSatoriTreemap = null;
    };

    self.autoStart = false;

    self.beforeChangeEvent = introJsBeforeChangeEvent();

    self.options = angular.copy(introJsDefaultOptions);
    self.options.steps = [
      {
        element: '#data-set-summary',
        intro:
        'This tour guides you through all details of the ' +
        '<em>data set view</em>.',
        position: 'left'
      },
      {
        element: '#data-set-summary-topbar',
        intro:
        'This tour guides you through all details of the ' +
        '<em>data set view</em>.',
        position: 'left'
      },
      {
        element: '#data-set-summary-summary',
        intro:
        'This tour guides you through all details of the ' +
        '<em>data set view</em>.',
        position: 'left'
      },
      {
        element: '#data-set-summary-analyses',
        intro:
        'This tour guides you through all details of the ' +
        '<em>data set view</em>.',
        position: 'left'
      },
      {
        element: '#data-set-summary-references',
        intro:
        'This tour guides you through all details of the ' +
        '<em>data set view</em>.',
        position: 'left'
      },
      {
        element: '#data-set-summary-protocols',
        intro:
        'This tour guides you through all details of the ' +
        '<em>data set view</em>.',
        position: 'left'
      },
      {
        element: '#data-set-summary',
        intro:
          'That\'s it for the list graph! For an integrative overview of all ' +
          'components please watch the example use case. If you want to ' +
          'learn more about the other components of SATORI please check out' +
          'the following guides: <ul>' +
          '<li class="clickable" onclick="introJsSatoriOverview' +
            '(\'satori-data-set-view\')">Data set list</li>' +
          '<li class="clickable" onclick="introJsSatoriOverview' +
            '(\'satori-list-graph\')">List graph visualization</li>' +
          '<li class="clickable" onclick="introJsSatoriOverview' +
            '(\'satori-treemap\')">Tree map visualization</li>' +
          '</ul>',
        position: 'left'
      }
    ];
  }

  return Intros;
}

angular
  .module('refineryDashboard')
  .factory('DashboardIntrosDataSetSummary', [
    'introJsDefaultOptions',
    'introJsBeforeChangeEvent',
    'dashboardIntroStarter',
    'dashboardIntroSatoriEasterEgg',
    DashboardIntrosDataSetSummary
  ]);
