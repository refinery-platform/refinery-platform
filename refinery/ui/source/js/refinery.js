angular
.module('refineryApp', [
  /*
   * Angular modules
   */
  'ngResource',

  /*
   * Third party modules
   */
  'ui.router',
  'ngWebworker',

  /*
   * Angular App globals
   */
  'errors',
  'pubSub',
  'closeOnOuterClick',
  'colors',

  /*
   * Refinery modules
   */
  'refineryRouter',
  'refineryWorkflows',
  'refineryNodeMapping',
  'refineryAnalysis',
  'refinerySolr',
  'refineryNodeRelationship',
  'refineryIgv',
  'refineryStatistics',
  'refineryMetadataTableImport',
  'refineryProvvis',
  'refineryDataSetImport',
  'refineryDataSetNav',
  'refineryDashboard',
  'refineryAnalyses',
  'refineryCollaboration',
  'refineryChart',
])
.config([
  '$provide',
  '$httpProvider',
  '$compileProvider',
  function ($provide, $httpProvider, $compileProvider) {
    // Disable debug info as it is not needed in general and decreases the
    // performance
    // More: https://docs.angularjs.org/guide/production
    $compileProvider.debugInfoEnabled(false);

    // http://stackoverflow.com/q/11252780
    $provide.decorator('$rootScope', ['$delegate', function ($delegate) {
      Object.defineProperty($delegate.constructor.prototype, '$onRootScope', {
        value: function (name, listener) {
          var unsubscribe = $delegate.$on(name, listener);
          this.$on('$destroy', unsubscribe);
        },
        enumerable: false
      });
      return $delegate;
    }
  ]);

  // use Django XSRF/CSRF lingo to enable communication with API
  $httpProvider.defaults.xsrfCookieName = 'csrftoken';
  $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
}])
.run(['$','$rootScope', function($, $rootScope){
    //  trigger from the contents.js when the node selection list has been
    // updated. Used by node_mapping.js Trigger for analyze tab view to run
    // analyses status.
  $(document).on('refinery/updateCurrentNodeSelection', function(e){
    $rootScope.$broadcast(e.type);
    $rootScope.$digest();
  });
}]);
