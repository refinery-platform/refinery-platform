angular.module('refineryExternalToolStatus')
    .factory("externalToolStatusFactory", ['$resource', externalToolStatusFactory]);

function externalToolStatusFactory($resource) {
  "use strict";
  return $resource('/api/v1/externaltoolstatus/', {format: 'json'});
}