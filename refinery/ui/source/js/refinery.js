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
    'file-model',
    'angular-intro',

    /*
     * Angular App globals
     */
    'errors',
    'getCookie',
    'colors',
    'clearFileInput',
    'mockParams',
    'replaceWhiteSpaceWithHyphen',
    'lodashLatest',

    /*
     * Refinery modules
     */
    'refineryRouter',
    'refineryProvvis',
    'refineryHome',
    'refineryDataSetImport',
    'refineryDataSetNav',
    'refineryDashboard',
    'refineryAnalysisMonitor',
    'refineryFileBrowser',
    'refineryDataSetAbout',
    'refineryToolLaunch',
    'refineryUserFileBrowser',
    'refineryDataSetVisualization',
    'refineryWorkflow'
  ]);
