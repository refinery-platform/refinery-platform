'use strict';

function DashboardIntrosSatoriTreemap (
  introJsDefaultOptions,
  introJsBeforeChangeEvent,
  dashboardIntroStarter,
  dashboardIntroSatoriEasterEgg,
  $rootScope,
  $,
  d3
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

    function reset () {
      // Make sure the SVG highlighting is disabled.
      $(document.body).removeClass('introjs-svg-el');

      // Make sure the visible depth is set to 1
      self.context._noVisibleDepthNotification = true;
      self.context.visibleDepth = 1;

      // Make sure we're looking at the root level
      var rootEl = document.querySelector(
        '#treemap-root-path li a'
      );
      if (rootEl) {
        self.context.transition(d3.select(rootEl).datum(), true);
      }
    }

    self.addContext = function (context) {
      self.context = context;
    };

    self.clickHandler = function (id) {
      self.complete();
      self._exit();
      dashboardIntroStarter.start(id);
    };

    self.start = function () {
      document.introJsSatoriTreemap = self.clickHandler;
      reset();

      // Call the start method of Intro.js
      self._start();
    };

    dashboardIntroStarter.register(self.id, self.start);
    dashboardIntroSatoriEasterEgg.register(self.id);

    self.complete = function () {
      dashboardIntroSatoriEasterEgg.completed(self.id);
      self.exit();
      reset();
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
        dynamicSvgElement: function () {
          var groups = document.querySelectorAll(
            '.treemap .group-of-nodes'
          );

          // The last `g` group is the largest rectangle
          return groups[groups.length - 1];
        },
        dynamicPosition: 'left',
        intro:
          'Each rectangle represents an ontology term. The size indicates ' +
          'the abundance and its color shows the depth of its subclass tree. ' +
          'The darker the deeper is the subtree; rectangles with a light ' +
          'gray background and no border are leaf terms, i.e., no subclass ' +
          'has been used for annotation.<br/>The rectangles are ordered in ' +
          'decreasing from the top left to the bottom right.',
        beforeExecutives: function () {
          $(document.body).addClass('introjs-svg-el');
        },
        afterExecutives: function () {
          $(document.body).removeClass('introjs-svg-el');
        }
      },
      {
        element: '#treemap',
        intro:
          'The rectangles are ordered in decreasing from the top left to the ' +
          'bottom right.<br/>Only leafs and internal ontology terms at a ' +
          'certain level are shown.',
        position: 'top'
      },
      {
        element: '#treemap-visible-depth',
        intro:
          'The visible depth can be controlled here.<br/><br/>Let\'s ' +
          'increase it by 1 for the next step&hellip;',
        position: 'left',
        beforeExecutives: function () {
          self.context._noVisibleDepthNotification = true;
          self.context.visibleDepth = 1;
          $rootScope.$apply();
        }
      },
      {
        element: '#treemap',
        intro:
          'We now see inner ontology terms at depth 2 and leafs up until ' +
          'depth 2<br/><br/>Let\'s ' +
          'increase the depth one more time&hellip;',
        position: 'top',
        beforeExecutives: function () {
          self.context._noVisibleDepthNotification = true;
          self.context.visibleDepth = 2;
        }
      },
      {
        element: '#treemap',
        intro:
          'The higher the depth the more fine grain structures get visible.',
        position: 'top',
        beforeExecutives: function () {
          self.context._noVisibleDepthNotification = true;
          self.context.visibleDepth = 3;
        },
        afterExecutives: function () {
          self.context._noVisibleDepthNotification = true;
          self.context.visibleDepth = 1;
        }
      },
      {
        dynamicSvgElement: function () {
          var groups = document.querySelectorAll(
            '.treemap .group-of-nodes'
          );

          // The last `g` group is the largest rectangle
          return groups[groups.length - 1];
        },
        dynamicPosition: 'left',
        intro:
          'Another way to navigate the treemap is to double click on a node ' +
          'to zoom into its subtree.<br/><br/>Let\'s open this nodes subtree' +
          '&hellip;',
        beforeExecutives: function () {
          $(document.body).addClass('introjs-svg-el');
        },
        afterExecutives: function () {
          $(document.body).removeClass('introjs-svg-el');
        }
      },
      {
        element: '#treemap-wrapper',
        position: 'left',
        intro:
          'We now look at the direct child terms in terms of the annotation ' +
          'hierarchy.',
        beforeExecutives: function () {
          var el = document.querySelectorAll(
            '.treemap .group-of-nodes'
          );
          el = el[el.length - 1];

          if (el) {
            self.context.transition(d3.select(el).datum(), true);
          }
        }
      },
      {
        element: '#treemap-root-path',
        position: 'left',
        intro:
          'The breadcrumb-like menu shows the linear path back to the global ' +
          'root term (i.e., <em>OWL:Thing</em>)',
        afterExecutives: function () {
          var el = document.querySelector(
            '#treemap-root-path li a'
          );

          if (el) {
            self.context.transition(d3.select(el).datum(), true);
          }
        }
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
    '$rootScope',
    '$',
    'd3',
    DashboardIntrosSatoriTreemap
  ]);
