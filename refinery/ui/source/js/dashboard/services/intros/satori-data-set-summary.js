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
          'This tour guides you through all details of this ' +
          '<em>data set summary / preview</em> page.<br/><br/><em>Note: ' +
          'whether the panels described in the following contain data or not ' +
          'depends on the current data set you are looking at.',
        position: 'left'
      },
      {
        element: '#data-set-summary-topbar',
        intro:
          'The topbar contains navigational and data set related actions: ' +
          'e.g., going back to the exploration view, opening the data set on ' +
          'the file browser, or sharing the data set with others.',
        position: 'left'
      },
      {
        element: '#data-set-summary-summary',
        intro:
          'The summary panel consists of the title, a short description, the ' +
          'underlying technology used for generating the data, the data ' +
          'sources, the number of associated files and the overall file size ' +
          'if available, and the owner.',
        position: 'left'
      },
      {
        element: '#data-set-summary-analyses',
        intro:
          'The analyses panel holds links to all analyses that have been run ' +
          'on this data sets, including the analysis name, date, and an ' +
          'indicator if the analysis ran successfully.',
        position: 'left'
      },
      {
        element: '#data-set-summary-references',
        intro:
          'Here are all references listed. They are pulled directly from PubMed. ' +
          'Links to PubMed and the journal website are provided as well.',
        position: 'left'
      },
      {
        element: '#data-set-summary-protocols',
        intro:
          'The protocol panel lists the data generation protocol as ' +
          'specified in the ISA-Tab of the data set.',
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
