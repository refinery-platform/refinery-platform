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
    'ui.router',
    'ngWebworker',
    'file-model',
    'angular-intro',

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

    /*
     * Refinery modules
     */
    'refineryRouter',
    'refineryWorkflows',
    'refineryNodeMapping',
    'refineryAnalysisLaunch',
    'refineryNodeRelationship',
    'refineryDataSetExplorer',
    'refineryStatistics',
    'refineryProvvis',
    'refineryDataSetImport',
    'refineryDataSetNav',
    'refineryDashboard',
    'refineryAnalysisMonitor',
    'refineryCollaboration',
    'refineryChart',
    'refineryFileBrowser',
    'refineryDataSetAbout',
    'refineryToolLaunch',
    'refineryUserFileBrowser'
  ])
  .run(['$', '$rootScope', function ($, $rootScope) {
    //  trigger from the contents.js when the node selection list has been
    // updated. Used by node_mapping.js Trigger for analyze tab view to run
    // analyses status.
    $(document).on('refinery/updateCurrentNodeSelection', function (e) {
      $rootScope.$broadcast(e.type);
      $rootScope.$digest();
    });
  }]);
