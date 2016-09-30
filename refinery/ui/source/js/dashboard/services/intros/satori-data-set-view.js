'use strict';

function DashboardIntrosDataSetView (
  introJsDefaultOptions,
  introJsBeforeChangeEvent,
  dashboardIntroStarter
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
  function Intros (/* context */) {
    dashboardIntroStarter.register('data-set-view', this.start);

    this.autoStart = false;
    this.beforeChangeEvent = introJsBeforeChangeEvent();
    this.start = function () {
      document.introJsSatoriDataSetView = this.clickHandler;

      // Call the start method of Intro.js
      this._start();
    };
    this.exit = function () {
      document.introJsSatoriDataSetView = null;
      console.log('Und schon ist der spaß vorbei');
    };
    this.options = angular.copy(introJsDefaultOptions);
    this.options.steps = [
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
        element: '#search-interface',
        intro:
        'See! We just searched for <em>RNA-Seq</em>.',
        position: 'right',
        beforeExecutives: function () {
          // context.searchQueryDataSets = 'RNA-Seq';
          // context.searchDataSets(context.searchQueryDataSets);
        },
        afterExecutives: function () {
          // context.resetDataSetSearch();
        }
      },
      {
        element: '#data-set-num',
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
        dynamicElementPosition: 'right',
        intro:
          'Each data set is represented by a small snippet, called ' +
          '<em>surrogate</em>, showing the data set\'s title, sharing ' +
          'information, and a button to add the data set to the data cart.' +
          '<br/><br/>A click on the title will open the <em>data set summary ' +
          'page</em> and a click on <span class="fa fa-table"></span> will ' +
          'bring you directly to the main data set page.'
      },
      {
        element: '#data-set-panel',
        intro:
        'That\'s all you for the data set view.<br/><br/>There are 3 more ' +
        'intros for the:<ul><li onclick="introJsSatoriDataSetView(1)" ' +
        'refinery-intro-js-id="1">data set summary page<li/>' +
        '<li>node-link diagram<li/><li>treemap<li/><ul/>',
        position: 'right'
      }
    ];

    this.clickHandler = function (id) {
      console.log('wooord: ' + id);
    };
  }

  return Intros;
}

angular
  .module('refineryDashboard')
  .factory('DashboardIntrosDataSetView', [
    'introJsDefaultOptions',
    'introJsBeforeChangeEvent',
    'dashboardIntroStarter',
    DashboardIntrosDataSetView
  ]);
