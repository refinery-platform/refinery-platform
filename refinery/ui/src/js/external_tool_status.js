angular.module('refineryExternalToolStatus', [])


.controller('ExternalToolStatusController', function(externalToolStatusService, $scope, $timeout, $log) {

  //console.log( externalToolStatusService );

  (function tick() {
      $scope.isSolrUp = externalToolStatusService.isSolrUp();
      $scope.isCeleryUp = externalToolStatusService.isCeleryUp();
      $scope.isGalaxyUp = externalToolStatusService.isGalaxyUp();
      
      if (externalToolStatusService.getSystemStatus() === "OK") {
        $scope.systemStatusOk = true;
        $scope.systemStatusWarning = false;
        $scope.systemStatusError = false;
        $scope.systemStatusUnknown = false;
      }
      else if (externalToolStatusService.getSystemStatus() === "WARNING") {
        $scope.systemStatusOk = false;
        $scope.systemStatusWarning = true;
        $scope.systemStatusError = false;
        $scope.systemStatusUnknown = false;
      }
      else if (externalToolStatusService.getSystemStatus() === "ERROR") {
        $scope.systemStatusOk = false;
        $scope.systemStatusWarning = false;
        $scope.systemStatusError = true;
        $scope.systemStatusUnknown = false;
      }
      else if (externalToolStatusService.getSystemStatus() === "UNKNOWN") {
        $scope.systemStatusOk = false;
        $scope.systemStatusWarning = false;
        $scope.systemStatusError = false;
        $scope.systemStatusUnknown = true;
      }

      $timeout(tick, 1000);
  })();
})

.directive('externaltoolstatus', function(externalToolStatusService, $log) {
  return {
    //template: '<div>Workflow Engines: <span ng-if="isGalaxyUp">Up</span><span ng-if="!isGalaxyUp">Down</span>&nbsp;Solr: <span ng-if="isSolrUp">Up</span><span ng-if="!isSolrUp">Down</span>&nbsp;Celery: <span ng-if="isCeleryUp">Up</span><span ng-if="!isCeleryUp">Down</span></div>',
    //template: '<div><b>System Status:</b> {{systemStatus}}</div>',
    templateUrl: '/static/partials/external_tool_status.html',
    restrict: 'A',
  };
})

.factory("externalToolStatusFactory", function($resource) {
  'use strict';

  return $resource(
    '/api/v1/externaltoolstatus', {
      format: 'json'
    }
  );
})

.service("externalToolStatusService", function(externalToolStatusFactory, $log, $timeout) {

  var tools;

  (function tick() {
      externalToolStatusFactory.get(function(response) {
        tools = {};
        processResponse(response.objects);
      }, function(response){
        tools = undefined;
        $log.error( "Error accessing external tool status API." );
      });
      $timeout(tick, 1000);
  })();

  function processResponse(objects) {
    for ( var i = 0; i < objects.length; ++i ) {
      tools[objects[i].name] = {};
    }

    for ( i = 0; i < objects.length; ++i ) {
      tools[objects[i].name][objects[i].unique_instance_identifier] = objects[i].status;
    }
  }

  var isSolrUp = function() {
      if ( !tools ) {
        return undefined;
      }
      if ( !tools.SOLR ) {
        return false;
      } 
      return tools.SOLR[""] === "SUCCESS";
  };
    
  var isCeleryUp = function() {
      if ( !tools ) {
        return undefined;
      }
    if ( !tools.CELERY ) {
      return false;
    }
    return tools.CELERY[""] === "SUCCESS";
  };

  var isGalaxyUp = function() {
      if ( !tools ) {
        return undefined;
      }
    if ( !tools.GALAXY ) {
      return false;
    }

    for (var key in tools.GALAXY) {
      if (tools.GALAXY.hasOwnProperty(key)) {
        if (tools.GALAXY[key] === "FAILURE") {
          return false;
        }
      }
    }

    return true;
  };

  var isGalaxyInstanceUp = function(uniqueInstanceId) {
    if ( !tools ) {
      return undefined;
    }
    if ( !tools.GALAXY ) {
      return false;
    }
    return tools.GALAXY[uniqueInstanceId] === "SUCCESS";
  };

  var getSystemStatus = function() {
    if (!tools) {
      return "UNKNOWN";
    }

    if (!isCeleryUp()) {
      return "ERROR";
    }

    if (!isSolrUp() || !isGalaxyUp()) {
      return "WARNING";
    }

    return "OK";
  };

  return ({
    getSystemStatus: getSystemStatus,
    isSolrUp: isSolrUp,
    isCeleryUp: isCeleryUp,
    isGalaxyUp: isGalaxyUp,
    isGalaxyInstanceUp: isGalaxyInstanceUp
  });
});

