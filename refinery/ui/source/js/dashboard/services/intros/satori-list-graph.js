'use strict';

function DashboardIntrosSatoriListGraph (
  introJsDefaultOptions,
  introJsBeforeChangeEvent,
  dashboardIntroStarter,
  dashboardIntroSatoriEasterEgg,
  triggerSvgEvent
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
        element: '#list-graph-wrapper .top-bar',
        intro:
          'This is the global that lets you sort the nodes by ' +
          '<em>precision</em>, <em>recall</em>, and <em>name</em>.<br/><br/>' +
          'You can also change the way precision and recall are displayed by ' +
          'clicking on <em>one bar</em> or <em>two bars</em>.<br/><br/>A ' +
          'click on the <em>zoom out</em> button shows the complete graph.' +
          '<br/><br/>Finally, a click on the button on the very right ' +
          'switches to the local column controls, as you will see next&hellip;',
        position: 'left'
      },
      {
        element: '#list-graph-wrapper .top-bar',
        intro:
          '&hellip;now you see the column control that let you sort each ' +
          'column individually by <em>precision</em> and<em>recall</em>.',
        position: 'left',
        beforeExecutives: function () {
          angular
            .element('#satori-list-graph .top-bar .control-switch')
            .trigger('click');
        },
        afterExecutives: function () {
          angular
            .element('#satori-list-graph .top-bar .control-switch')
            .trigger('click');
        }
      },
      {
        element: '#list-graph-wrapper .global-controls .sort-precision',
        intro:
          'Precision is defined as the number of retrieved data sets ' +
          'annotated with an ontology term divided by the total number of ' +
          'retrieved data sets.<br/><br/>E.g., if 6 out of 12 data sets ' +
          'annotated with <em>cancer</em> have been returned in a search for ' +
          '<em>liver</em> than the precision of <em>cancer</em> is 0.5. In ' +
          'other words, half of all retrieved data sets are related to ' +
          '<em>cancer</em>.',
        position: 'left',
        beforeExecutives: function () {
          triggerSvgEvent(
            document.querySelector(
              '#satori-list-graph .global-controls .sort-precision'
            ),
            'mouseenter'
          );
        },
        afterExecutives: function () {
          triggerSvgEvent(
            document.querySelector(
              '#satori-list-graph .global-controls .sort-precision'
            ),
            'mouseleave'
          );
        }
      },
      {
        element: '#list-graph-wrapper .global-controls .sort-recall',
        intro:
          'Recall is defined as the number of retrieved data sets ' +
          'annotated with an ontology term divided by the total number of ' +
          'data sets annotated with this term.<br/><br/>E.g., if 6 of all 8 ' +
          'data sets annotated with <em>cancer</em> have been returned in a ' +
          'search for <em>liver</em> the recall of <em>cancer</em> is 0.75. ' +
          'In other words, 75% of all <em>cancer</em>-related data sets have ' +
          'been found with the search.<br/><br/><em>Note: if you haven\'t ' +
          'filtered or search for anything the recall is always one.</em>',
        position: 'left',
        beforeExecutives: function () {
          triggerSvgEvent(
            document.querySelector(
              '#satori-list-graph .global-controls .sort-recall'
            ),
            'mouseenter'
          );
        },
        afterExecutives: function () {
          triggerSvgEvent(
            document.querySelector(
              '#satori-list-graph .global-controls .sort-recall'
            ),
            'mouseleave'
          );
        }
      },
      {
        element: '#list-graph-wrapper .list-graph',
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
    'triggerSvgEvent',
    DashboardIntrosSatoriListGraph
  ]);
