'use strict';

function DashboardSatoriIntros (
  introJsDefaultOptions, introJsBeforeChangeEvent
) {
  function SatoriIntros (context) {
    // Intro.js
    this.overviewOptions = angular.copy(introJsDefaultOptions);
    this.overviewOptions.steps = [
      {
        element: '#intro-js-satori-overview-start',
        intro:
          'This is a quick introduction to the main interfaces of SATORI.</br>' +
          '</br>More are specific guides are available as well. Look for ' +
          '<span class="fa fa-info-circle"></span>.',
        position: 'bottom'
      },
      {
        element: '#intro-js-data-set-view',
        intro:
          'This is the data set view conisting of the search interface, the ' +
          'list of data sets, filter options, the data cart.',
        position: 'right'
      },
      {
        element: '#intro-js-search-interface',
        intro:
        'The search interface starts querying as you type. Its design has ' +
        'been kept at a minimum.',
        position: 'right'
      },
      {
        element: '#intro-js-data-set-header',
        intro:
          'On the left you see the total number of data sets or results, and ' +
          'on the right you have a button to open the data cart, to filter ' +
          'and to sort data sets.</br><em>Note:</em> Sorting search results ' +
          'is not possible.',
        position: 'right'
      },
      {
        element: '#intro-js-data-set-list',
        intro:
          'The list of data sets holds either all data sets or the results ' +
          'of a search or term query.</br>Each data set is represented by a ' +
          'small snippet showing the title, sharing information, etc.',
        position: 'right'
      },
      {
        element: '#intro-js-exploration-view',
        intro:
          'This is the <em>exploration view</em> containing the two main ' +
          'visualizations for exploring the Refinery Platform',
        position: 'left'
      },
      {
        element: '#intro-js-list-graph',
        intro:
          'This is the node-link diagram.',
        position: 'left'
      },
      {
        element: '#intro-js-treemap',
        intro:
          'This is the treemap.',
        position: 'left'
      }
    ];

    this.overviewShouldAutoStart = false;

    this.overviewCompletedEvent = function () {
      // console.log('Completed Event called');
    };

    this.overviewExitEvent = function () {
      // console.log('Exit Event called');
    };

    this.overviewBeforeChangeEvent = introJsBeforeChangeEvent();

    this.dataSetViewOptions = angular.copy(introJsDefaultOptions);
    this.dataSetViewOptions.steps = [
      {
        element: '#intro-js-data-set-view',
        intro:
        'This tour guides you through all details of the ' +
        '<em>data set view</em>.',
        position: 'right'
      },
      {
        element: '#intro-js-search-interface',
        intro:
        'The search interface\'s design has been kept at a minimum, so there ' +
        'are advanced options.<br/>With a short delay, the queries are ' +
        'issued as you type. There is no need to hit <em>enter</em>.',
        position: 'right'
      },
      {
        element: '#intro-js-search-interface',
        intro:
        'See! We just searched for <em>RNA-Seq</em>.',
        position: 'right',
        beforeExecutives: function () {
          context.searchQueryDataSets = 'RNA-Seq';
          context.searchDataSets(context.searchQueryDataSets);
        },
        afterExecutives: function () {
          context.resetDataSetSearch();
        }
      },
      {
        element: '#intro-js-data-set-num',
        intro:
          'Here you see the total number of data sets or results.',
        position: 'right'
      },
      {
        element: '#intro-js-data-cart-filter-sort',
        intro:
          'Here you have a button to open the data cart, to filter ' +
          'and to sort data sets.</br><em>Note:</em> Sorting search results ' +
          'is not possible.',
        position: 'right'
      },
      {
        element: '#intro-js-data-set-list',
        intro:
          'The list of data sets holds either all data sets or the results ' +
          'of a search or term query.</br>Each data set is represented by a ' +
          'small snippet showing the title, sharing information, etc.',
        position: 'right'
      },
      {
        dynamicElement: function () {
          return document.querySelectorAll(
            '.intro-js-data-set-surrogate'
          )[0];
        },
        dynamicElementPosition: 'right',
        intro:
          'This a data set snippet holding the data sets title, sharing ' +
          'information, and a button to add the data set to the data cart.',
      }
    ];

    this.dataSetViewShouldAutoStart = false;
    this.dataSetViewBeforeChangeEvent = introJsBeforeChangeEvent();
  }

  return SatoriIntros;
}

angular
  .module('refineryDashboard')
  .factory('DashboardSatoriIntros', [
    'introJsDefaultOptions',
    'introJsBeforeChangeEvent',
    DashboardSatoriIntros
  ]);
