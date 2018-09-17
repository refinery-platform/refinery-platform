'use strict';

window.getStaticUrl = function (relativePath) {
  // must be a global because used for config of modules other than refineryApp
  try {
    return window.djangoApp.staticUrl + relativePath;
  } catch (e) {
    // window.djangoApp is defined in base.html which is not loaded by Karma
    return '/static/' + relativePath;
  }
};

angular
  .module('refineryApp', [
    /*
     * Angular modules
     */
    'ngResource',
    'ngMessages',

    /*
     * Third party modules
     */
    'ui.bootstrap',
    'ui.router',
    'ngWebworker',
    'file-model',
    'angular-intro',
    'LocalStorageModule',

    /*
     * Angular App globals
     */
    'errors',
    'pubSub',
    'getCookie',
    'closeOnOuterClick',
    'colors',
    'focusOn',
    'clearFileInput',
    'mockParams',
    'replaceWhiteSpaceWithHyphen',
    'triggerSvgEvent',

    /*
     * Refinery modules
     */
    'refineryRouter',
    'refineryStatistics',
    'refineryProvvis',
    'refineryDataSetImport',
    'refineryDataSetNav',
    'refineryDashboard',
    'refineryAnalysisMonitor',
    'refineryCollaboration',
    'refineryFileBrowser',
    'refineryDataSetAbout',
    'refineryToolLaunch',
    'refineryUserFileBrowser',
    'refineryDataSetVisualization'
  ]);
