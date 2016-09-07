'use strict';

function DashboardSatoriIntros (introJsDefaultOptions) {
  function SatoriIntros () {
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

    this.overviewChangeEvent = function (/* targetElement */) {
      // Triggered before a new tip is shown.

      // console.log('Change Event called');
      // console.log(targetElement);  // The target element
      // console.log(this);  // The IntroJS object
    };

    this.overviewBeforeChangeEvent = function (/* targetElement */) {
      // console.log('Before Change Event called');
      // console.log(targetElement);
    };

    this.overviewAfterChangeEvent = function (/* targetElement */) {
      // console.log('After Change Event called');
      // console.log(targetElement);
    };

    this.dataSetViewOptions = angular.copy(introJsDefaultOptions);
    this.dataSetViewOptions.steps = [
      {
        element: '#intro-js-data-set-view',
        intro:
        'This tour guides you through all details of the data set view.',
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
        element: document.querySelectorAll(
          '.intro-js-data-set-surrogate'
        )[0],
        intro:
          'This a data set snippet holding the data sets title, sharing ' +
          'information, and a button to add the data set to the data cart.',
        position: 'right'
      }
    ];

    this.dataSetViewShouldAutoStart = false;

    this.dataSetViewChangeEvent = function () {
      // Triggered before a new tip is shown.

      // This is pretty hacky but there is no other way to dynamically pick a
      // target element.
      if (this._currentStep === 5) {
        this._introItems[this._currentStep].element =
          document.querySelectorAll('.intro-js-data-set-surrogate')[0];
        this._introItems[this._currentStep].position = 'right';
      }
    };
  }

  return new SatoriIntros();
}

angular
  .module('refineryDashboard')
  .factory('dashboardSatoriIntros', [
    'introJsDefaultOptions',
    DashboardSatoriIntros
  ]);
