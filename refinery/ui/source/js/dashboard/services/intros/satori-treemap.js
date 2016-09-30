'use strict';

function DashboardIntrosSatoriTreemap (
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

    self.id = 'satori-treemap';

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
        element: '#treemap-wrapper',
        intro:
        'This is the treemap diagram, visualizing the relative abundance of ' +
        'annotation terms of the list of data sets on the left.',
        position: 'top'
      },
      {
        element: '#treemap-wrapper',
        intro:
          'That\'s it for the list graph! For an integrative overview of all ' +
          'components please watch the example use case. If you want to ' +
          'learn more about the other components of SATORI please check out' +
          'the following guides: <ul>' +
          '<li class="clickable" onclick="introJsSatoriTreemap' +
            '(\'satori-list-graph\')">List graph visualization</li>' +
          '<li class="clickable" onclick="introJsSatoriTreemap' +
            '(\'satori-data-set-view\')">Data set list</li>' +
          '<li class="clickable" onclick="introJsSatoriTreemap' +
            '(\'satori-data-set-summary\')">Data set summary</li>' +
          '</ul>',
        position: 'top'
      }
    ];
  }

  return Intros;
}

angular
  .module('refineryDashboard')
  .factory('DashboardIntrosSatoriTreemap', [
    'introJsDefaultOptions',
    'introJsBeforeChangeEvent',
    'dashboardIntroStarter',
    'dashboardIntroSatoriEasterEgg',
    DashboardIntrosSatoriTreemap
  ]);
