'use strict';

function DashboardIntrosSatoriListGraph (
  introJsDefaultOptions,
  introJsBeforeChangeEvent,
  dashboardIntroStarter,
  dashboardIntroSatoriEasterEgg,
  triggerSvgEvent,
  $,
  dashboardVisQueryTerms,
  $rootScope
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

      // Ensure that the global menu is visible
      angular
        .element('#list-graph-wrapper .top-bar.details .control-switch')
        .trigger('click');

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

      // Ensure that the global menu is visible
      angular
        .element('#list-graph-wrapper .top-bar.details .control-switch')
        .trigger('click');

      // Ensure nothing is hovered
      var sortPrecisionEl = document.querySelector(
        '#list-graph-wrapper .global-controls .sort-precision'
      );
      triggerSvgEvent(sortPrecisionEl, 'mouseleave');
      angular.element(sortPrecisionEl).removeClass('fakeHover');

      var sortRecallEl = document.querySelector(
        '#list-graph-wrapper .global-controls .sort-recall'
      );
      triggerSvgEvent(sortRecallEl, 'mouseleave');
      angular.element(sortRecallEl).removeClass('fakeHover');

      $(document.querySelector(
        '#list-graph-wrapper .visible-node'
      )).trigger('mouseleave');

      // Remove the intro-js SVG helper
      $(document.body).removeClass('introjs-svg-el');

      $('.introjs-prevbutton').css('display', null);
    };

    self.autoStart = false;

    self.beforeChangeEvent = introJsBeforeChangeEvent();

    function icon (name) {
      return (
        '<svg class="icon-inline">' +
        '  <use' +
        '    xmlns:xlink="http://www.w3.org/1999/xlink"' +
        '    xlink:href="/static/vendor/d3-list-graph/dist/icons.svg#' + name + '">' +
        '  </use>' +
        '</svg>'
      );
    }

    function image (name) {
      return (
        '<svg>' +
        '  <use' +
        '    xmlns:xlink="http://www.w3.org/1999/xlink"' +
        '    xlink:href="/images/' + name + '">' +
        '  </use>' +
        '</svg>'
      );
    }


    self.options = angular.copy(introJsDefaultOptions);
    self.options.steps = [
      {
        element: '#list-graph-wrapper',
        intro:
        'This is the list graph showing the relationships of data set ' +
        'attributes. The relationships are defined by multiple ontologies.',
        position: 'left'
      },
      {
        element: '#list-graph-wrapper .top-bar',
        intro:
          'This is the global top-bar that lets you sort nodes by ' +
          '<em>precision</em>, <em>recall</em>, and <em>name</em>.<br/><br/>' +
          'You can also change the way precision and recall are displayed by ' +
          'clicking on <em>one bar ' + icon('one-bar') + '</em> or ' +
          '<em>two bars ' + icon('two-bars') + '</em>.<br/><br/>A ' +
          'click on the <em>zoom out ' + icon('zoom-out') + '</em> button ' +
          'shows the complete graph.<br/><br/>Finally, a click on the button ' +
          'on the very right ' + icon('arrow-down') + ' switches to the ' +
          'local column-wise controls, as you will see next&hellip;',
        position: 'left'
      },
      {
        element: '#list-graph-wrapper .top-bar',
        intro:
          '&hellip;now you can sort each column individually by ' +
          '<em>precision</em> and <em>recall</em>.',
        position: 'left',
        beforeExecutives: function () {
          angular
            .element('#list-graph-wrapper .top-bar .control-switch')
            .trigger('click');
        },
        afterExecutives: function () {
          angular
            .element('#list-graph-wrapper .top-bar .control-switch')
            .trigger('click');
        }
      },
      {
        dynamicElement: function () {
          return document.querySelector(
            '#list-graph-wrapper .global-controls .sort-precision'
          );
        },
        dynamicPosition: 'left',
        intro:
          '<strong>Precision</strong> (highlighted in blue) is defined as ' +
          'the number of retrieved ' +
          'data sets annotated with an ontology term divided by the total ' +
          'number of retrieved data sets.<br/><br/>' +

          'E.g., if 6 out of <strong>retrieved</strong> 12 ' +
          'data sets, annotated with <em>cancer</em>, have been returned in a ' +
          'search for <em>liver</em> than the precision of <em>cancer</em> ' +
          'is 0.5. In other words, half of all retrieved data sets are ' +
          'related to <em>cancer</em> (see the figure below).<br/><br/>' +

          'Note that this does not tell us how many <em>cancer</em> ' +
          'data sets are available in the repository!<br/><br/>' +

          image('intro-js-precision.png'),
        beforeExecutives: function () {
          var el = document.querySelector(
            '#list-graph-wrapper .global-controls .sort-precision'
          );

          triggerSvgEvent(el, 'mouseenter');
          angular.element(el).addClass('fakeHover');
        },
        afterExecutives: function () {
          var el = document.querySelector(
            '#list-graph-wrapper .global-controls .sort-precision'
          );
          triggerSvgEvent(el, 'mouseleave');
          angular.element(el).removeClass('fakeHover');
        }
      },
      {
        element: '#list-graph-wrapper .global-controls .sort-recall',
        intro:
          '<strong>Recall</strong> (highlighted in blue) is defined as the ' +
          'number of retrieved data sets ' +
          'annotated with an ontology term divided by the total number of ' +
          'data sets annotated with this term.<br/><br/>E.g., if 6 of <strong>all</strong> 8 ' +
          'data sets, annotated with <em>cancer</em>, have been returned in a ' +
          'search for <em>liver</em> the recall of <em>cancer</em> is 0.75. ' +
          'In other words, 75% of all <em>cancer</em>-related data sets have ' +
          'been found with the search (See figure below).<br>/<br/>' +
          image('intro-js-recall.png') +
          '<br/><em>Note: We haven\'t queried for anything so the recall is 1.</em>',
        position: 'left',
        beforeExecutives: function () {
          var el = document.querySelector(
            '#list-graph-wrapper .global-controls .sort-recall'
          );

          triggerSvgEvent(el, 'mouseenter');
          angular.element(el).addClass('fakeHover');
        },
        afterExecutives: function () {
          var el = document.querySelector(
            '#list-graph-wrapper .global-controls .sort-recall'
          );
          triggerSvgEvent(el, 'mouseleave');
          angular.element(el).removeClass('fakeHover');
        }
      },
      {
        dynamicSvgElement: function () {
          return document.querySelector(
            '#list-graph-wrapper .visible-node'
          );
        },
        dynamicPosition: 'bottom',
        intro:
          'Hovering over an attribute highlight parent and child terms and ' +
          'data sets associated with this attribute',
        beforeExecutives: function () {
          $(document.querySelector(
            '#list-graph-wrapper .visible-node'
          )).trigger('mouseenter');
          $(document.body).addClass('introjs-svg-el');
        },
        afterExecutives: function () {
          $(document.querySelector(
            '#list-graph-wrapper .visible-node'
          )).trigger('mouseleave');
          $(document.querySelector(
            '#list-graph-wrapper .visible-node'
          )).trigger('click');
        }
      },
      {
        dynamicSvgElement: function () {
          return document.querySelector(
            '#list-graph-wrapper .context-menu'
          );
        },
        dynamicPosition: 'left',
        intro:
          'A click on a node open the <em>context menu</em>, which show the ' +
          'node\'s OntID and URI, let\'s us query the data set collection ' +
          'by this term, re-roots the node list diagram or focusses the ' +
          'node\'s parents and children.<br/><br/>'
      },
      {
        dynamicSvgElement: function () {
          return document.querySelector(
            '#list-graph-wrapper .visible-node'
          ).parentNode;
        },
        dynamicPosition: 'bottom',
        intro:
          'We\'ve now re-rooted (indicated by the orange icon to the left of ' +
          'the node) the node-link diagram to only show the ' +
          'siblings and children of the current node.<br/><br/>The orange ' +
          'icon to the right indicates that we\'re also querying the data ' +
          'collection by this term.',
        beforeExecutives: function () {
          var node = document.querySelector(
            '#list-graph-wrapper .visible-node'
          ).__data__;

          dashboardVisQueryTerms.set(
            node.uri,
            {
              uri: node.uri,
              label: node.name,
              mode: 'OR'
            }
          );

          $rootScope.$emit('dashboardVisNodeRoot', {
            nodeUri: node.uri,
            dataSets: [],
            source: 'treeMap'
          });

          $('.introjs-prevbutton').css('display', 'none');
        },
        afterExecutives: function () {
          $(document.body).removeClass('introjs-svg-el');
        }
      },
      {
        element: '#query-terms',
        position: 'left',
        intro:
          'The re-rooting or direct queries are shown in this bar for ' +
          'easy manipulation. A click on the x button will ' +
          'bring us back to the global root node.<br/>It is possible to ' +
          'toggle through different Boolean query modes ' +
          '(i.e., OR, AND, or NOT).',
        afterExecutives: function () {
          var node = document.querySelector(
            '#list-graph-wrapper .visible-node'
          ).__data__;

          $rootScope.$emit('dashboardVisNodeUnroot', {
            nodeUri: node.uri,
            dataSets: [],
            source: 'treeMap'
          });
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
    '$',
    'dashboardVisQueryTerms',
    '$rootScope',
    DashboardIntrosSatoriListGraph
  ]);
