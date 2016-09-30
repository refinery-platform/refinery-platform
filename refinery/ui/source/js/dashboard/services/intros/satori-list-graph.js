'use strict';

function DashboardIntrosSatoriListGraph (
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

    self.id = 'satori-list-graph';

    self.clickHandler = function (id) {
      self.complete();
      self._exit();
      dashboardIntroStarter.start(id);
    };

    self.start = function () {
      document.introJsSatoriListGraph = self.clickHandler;

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
      document.introJsSatoriListGraph = null;
    };

    self.autoStart = false;

    self.beforeChangeEvent = introJsBeforeChangeEvent();

    self.options = angular.copy(introJsDefaultOptions);
    self.options.steps = [
      {
        element: '#list-graph-wrapper',
        intro:
        'This is the list graph showing the ontological relationships of' +
        'annotation terms.',
        position: 'left'
      },
      {
        element: '#list-graph-wrapper',
        intro:
          'That\'s it for the list graph! For an integrative overview of all ' +
          'components please watch the example use case. If you want to ' +
          'learn more about the other components of SATORI please check out' +
          'the following guides: <ul>' +
          '<li class="clickable" onclick="introJsSatoriListGraph' +
            '(\'satori-treemap\')">Tree map visualization</li>' +
          '<li class="clickable" onclick="introJsSatoriListGraph' +
            '(\'satori-data-set-view\')">Data set list</li>' +
          '<li class="clickable" onclick="introJsSatoriListGraph' +
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
  .factory('DashboardIntrosSatoriListGraph', [
    'introJsDefaultOptions',
    'introJsBeforeChangeEvent',
    'dashboardIntroStarter',
    'dashboardIntroSatoriEasterEgg',
    DashboardIntrosSatoriListGraph
  ]);
