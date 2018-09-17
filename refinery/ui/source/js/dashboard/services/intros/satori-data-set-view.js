'use strict';

function DashboardIntrosDataSetView (
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
   * @param   {Object}  context  Sometimes intro steps need to have access to
   *   the context of the controller to trigger certain actions.
   */
  function Intros (context) {
    var self = this;

    self.id = 'satori-data-set-view';

    self.clickHandler = function (id) {
      self.complete();
      self._exit();
      dashboardIntroStarter.start(id);
    };

    self.start = function () {
      document.introJsSatoriDataSetView = self.clickHandler;
      context.resetDataSetSearch(true);

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
      document.introJsSatoriDataSetView = null;
      context.resetDataSetSearch(true);
    };

    self.autoStart = false;

    self.beforeChangeEvent = introJsBeforeChangeEvent();

    self.options = angular.copy(introJsDefaultOptions);
    self.options.steps = [
      {
        element: '#data-set-panel',
        intro:
        'This tour guides you through all details of the ' +
        '<em>data set view</em>.',
        position: 'right'
      },
      {
        element: '#search-interface',
        intro:
        'The search interface\'s design has been kept at a minimum, so there ' +
        'are no advanced options.<br/>With a short delay, the queries are ' +
        'issued as you type. There is no need to hit <em>enter</em>.',
        position: 'right'
      },
      {
        element: '#total-datasets',
        intro:
          'Here you can see the total number of available data sets or the' +
          'number results returned by a search or term query.',
        position: 'right'
      },
      {
        element: '#data-cart-filter-sort',
        intro:
          'Here you have a button to open the data cart (<span class="fa ' +
          'fa-shopping-cart primary-text-page"></span>), to filter (<span ' +
          'class="fa fa-filter primary-text-page"></span>), and to sort (' +
          '<span class="fa fa-sort primary-text-page"></span>) data sets.' +
          '</br></br>The data cart lets you temporarily store data sets of ' +
          'interest during exploration. You can add and remove data sets via ' +
          'a click on the <em>star</em> (<span class="fa fa-star-o ' +
          'primary-text-page"></span> / <span class="fa fa-star ' +
          'primary-text-page"></span>) icon.</br></br>Note that filtering ' +
          'and sorting of search results is not possible.',
        position: 'right'
      },
      {
        element: '#data-set-list',
        intro:
          'The list of data sets holds either all data sets or the results ' +
          'of a search or term query.<br/><br/>The list dynamically loads ' +
          'new content as you scroll down.',
        position: 'right'
      },
      {
        dynamicElement: function () {
          return document.querySelectorAll(
            '.data-set-surrogate'
          )[0];
        },
        dynamicPosition: 'right',
        intro:
          'Each data set is represented by a small snippet, called ' +
          '<em>surrogate</em>, showing the data set\'s title, sharing ' +
          'information, and a button to add the data set to the data cart.' +
          '<br/><br/>A click on the title will open the <em>data set summary ' +
          'page</em> and a click on <span class="fa fa-folder-open-o"></span> will ' +
          'bring you directly to the main data set page.'
      },
      {
        element: '#search-interface',
        intro:
        'The search is executed immediately after typing. For example, we ' +
        'just searched for <em>RNA-Seq</em>.',
        position: 'right',
        beforeExecutives: function () {
          context.searchQueryDataSets = 'RNA-Seq';
          context.searchDataSets(context.searchQueryDataSets, true);
        }
      },
      {
        dynamicElement: function () {
          return document.querySelectorAll(
            '.data-set-surrogate'
          )[0];
        },
        dynamicPosition: 'right',
        intro:
          'The data set surrogate highlights the search keywords in the ' +
          'title.',
        afterExecutives: function () {
          context.resetDataSetSearch(true);
        }
      },
      {
        element: '#data-set-panel',
        intro:
        'That\'s all you for the data set view.<br/><br/>There are 3 more ' +
        'intros for the:<ul>' +
        '<li class="clickable" onclick="introJsSatoriDataSetView' +
          '(\'satori-list-graph\')">List graph visualization</li>' +
        '<li class="clickable" onclick="introJsSatoriDataSetView' +
          '(\'satori-treemap\')">Treemap visualization</li>' +
        '<li class="clickable" onclick="introJsSatoriDataSetView' +
          '(\'satori-data-set-summary\')">Data set summary</li>' +
        '</ul>',
        position: 'right'
      }
    ];
  }

  return Intros;
}

angular
  .module('refineryDashboard')
  .factory('DashboardIntrosDataSetView', [
    'introJsDefaultOptions',
    'introJsBeforeChangeEvent',
    'dashboardIntroStarter',
    'dashboardIntroSatoriEasterEgg',
    DashboardIntrosDataSetView
  ]);
