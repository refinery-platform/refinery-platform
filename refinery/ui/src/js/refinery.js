angular
.module('refineryApp', [
  /*
   * Angular App commons
   */
  'errors',

  /*
   * Refinery modules
   */
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
  'refinerySharing',
  'refineryDataFileUpload',
  'refineryDashboard'
])
.config(['$provide', '$httpProvider', function ($provide, $httpProvider) {
  // http://stackoverflow.com/questions/11252780/whats-the-correct-way-to-communicate-between-controllers-in-angularjs
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
    // updated. Used by node_mapping.js
  $(document).on('refinery/nodeSelectCheckbox refinery/nodeSelectDatasetNew', function(e){
    //e.type grabs the event name
    $rootScope.$broadcast(e.type);
    $rootScope.$digest();
  });
}]);
