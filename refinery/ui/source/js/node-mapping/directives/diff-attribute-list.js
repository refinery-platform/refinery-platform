angular
  .module('refineryNodeMapping')
  .directive('diffAttributeList', function($log) {
  return {
    templateUrl: '/static/partials/diff-attribute-list.html',
    restrict: 'A',
    scope: {
      setA: '=',
      setB: '='
    },
    link: function (scope, elem, attrs) {

        var updateDiff = function() {
          scope.diffAttributes = [];
          scope.commonAttributes = [];

          var i = 0;

          $log.debug( "Updating diff lists ..." );

          if ( scope.setA.attributes === null && scope.setB.attributes === null ) {
            $log.debug( "Both sets empty" );
            return;
          }

          if ( scope.setB.attributes !== null && scope.setA.attributes !== null ) {
            for ( i = 0; i < scope.setA.attributes.length; ++i ) {
              if ( scope.setA.attributes[i].name === scope.setB.attributes[i].name ) {
                if ( scope.setA.attributes[i].value === scope.setB.attributes[i].value ) {
                  scope.commonAttributes.push( { name: scope.setA.attributes[i].name, value: scope.setA.attributes[i].value });
                }
                else {
                  scope.diffAttributes.push( { name: scope.setA.attributes[i].name, valueSetA: scope.setA.attributes[i].value, valueSetB: scope.setB.attributes[i].value });
                }
              }
            }

            return;
          }

          if ( scope.setA.attributes === null ) {
            for ( i = 0; i < scope.setB.attributes.length; ++i ) {
                  scope.commonAttributes.push( { name: scope.setB.attributes[i].name, value: scope.setB.attributes[i].value });
            }

            return;
          }

          if ( scope.setB.attributes === null ) {
            for ( i = 0; i < scope.setA.attributes.length; ++i ) {
                  scope.commonAttributes.push( { name: scope.setA.attributes[i].name, value: scope.setA.attributes[i].value });
            }

            return;
          }

        };

        scope.$watch('setA.attributes', function( oldVal, newVal ) {
             if( oldVal && !newVal ) {
               $log.debug( "Attribute setA initialized" );
               updateDiff();
             }
             if(newVal) {
               $log.debug( "Attribute setA changed" );
               updateDiff();
             }
         });

        scope.$watch('setB.attributes', function( oldVal, newVal ) {
             if( oldVal && !newVal ) {
               $log.debug( "Attribute setB initialized" );
               updateDiff();
             }
             if(newVal) {
               $log.debug( "Attribute setB changed" );
               updateDiff();
             }
         });
    }
  };
});
