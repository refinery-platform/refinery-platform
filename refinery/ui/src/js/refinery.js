angular
.module('refineryApp', [
  /*
   * Angular modules
   */
  'ngResource',

  /*
   * Third party modules
   */
  'xml',
  'ui.router',

  /*
   * Angular App globals
   */
  'errors',

  /*
   * Refinery modules
   */
  'refineryRouter',
  'refineryWorkflows',
  'refineryNodeMapping',
  'refineryAnalysis',
  'refinerySolr',
  'refineryExternalToolStatus',
  'refineryNodeRelationship',
  'refineryIgv',
  'refineryStatistics',
  'refineryMetadataTableImport',
  'refineryProvvis',
  'refineryDataSetImport',
  'refineryDashboard',
  'refineryAnalyses',
  'refineryCollaboration',
  'refineryChart',
])
.config(['$provide', '$httpProvider', function ($provide, $httpProvider) {
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
  }]);

  // use Django XSRF/CSRF lingo to enable communication with API
  $httpProvider.defaults.xsrfCookieName = 'csrftoken';
  $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
}])
.run(['$','$rootScope', function($, $rootScope){
    //  trigger from the contents.js when the node selection list has been
    // updated. Used by node_mapping.js Trigger for analyze tab view to run
    // analyses status.
  $(document).on('refinery/updateCurrentNodeSelection' +
  ' refinery/analyze-tab-active refinery/analyze-tab-inactive', function(e){
    $rootScope.$broadcast(e.type);
    $rootScope.$digest();
  });
}]);
