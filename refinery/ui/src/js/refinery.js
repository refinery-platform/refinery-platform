angular
.module('refineryApp', [
  /*
   * Angular modules
   */
  'ngCookies',

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
  'refineryDataFileUpload'
])
.config(['$provide', function ($provide) {
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
}]);
