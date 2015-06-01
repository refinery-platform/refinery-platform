angular.module('refineryExternalToolStatus')
    .controller('ExternalToolStatusController',
    ['externalToolStatusFactory', 'externalToolStatusService', '$scope', '$timeout', '$log', ExternalToolStatusController]);


function ExternalToolStatusController(
    externalToolStatusFactory, externalToolStatusService, $scope, $timeout, $log) {
    "use strict";
        console.log("in external tool status controller");
  var vm = this;
  var tools;
  vm.tools_details = externalToolStatusService.getToolsDetails();
        $scope.tools_details = vm.tools_details;

  (function tick() {
      externalToolStatusFactory.get(function(response) {
        tools = {};
        processResponse(response.objects);
      }, function(response){
        tools = undefined;
        $log.error( "Error accessing external tool status API." );
      });

      function processResponse(objects) {
        for ( var i = 0; i < objects.length; ++i ) {
          externalToolStatusService.setWhichTool(objects[i]);
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
          return tools.SOLR[null] === "SUCCESS";
      };

      var isCeleryUp = function() {
          if ( !tools ) {
            return undefined;
          }
        if ( !tools.CELERY ) {
          return false;
        }
        return tools.CELERY[null] === "SUCCESS";
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
            if (tools.GALAXY[key] !== "SUCCESS") {
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

      $scope.isSolrUp = isSolrUp();
      $scope.isCeleryUp = isCeleryUp();
      $scope.isGalaxyUp = isGalaxyUp();

      if (getSystemStatus() === "OK") {
        $scope.systemStatusOk = true;
        $scope.systemStatusWarning = false;
        $scope.systemStatusError = false;
        $scope.systemStatusUnknown = false;
      }
      else if (getSystemStatus() === "WARNING") {
        $scope.systemStatusOk = false;
        $scope.systemStatusWarning = true;
        $scope.systemStatusError = false;
        $scope.systemStatusUnknown = false;
      }
      else if (getSystemStatus() === "ERROR") {
        $scope.systemStatusOk = false;
        $scope.systemStatusWarning = false;
        $scope.systemStatusError = true;
        $scope.systemStatusUnknown = false;
      }
      else if (getSystemStatus() === "UNKNOWN") {
        $scope.systemStatusOk = false;
        $scope.systemStatusWarning = false;
        $scope.systemStatusError = false;
        $scope.systemStatusUnknown = true;
      }

      $timeout(tick, 1000);
  })();
}