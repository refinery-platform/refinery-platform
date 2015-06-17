angular
.module('refineryApp', [
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
}])
.constant('$', jQuery)
.run(['$','$rootScope', function($, $rootScope){
    //  trigger from the contents.js when the node selection list has been
    // updated. Used by node_mapping.js
  $(document).on('refinery/nodeSelectCheckbox', function(e){
    $rootScope.$broadcast('refinery/nodeSelectCheckbox');
    $rootScope.$digest();
  });
}]);
