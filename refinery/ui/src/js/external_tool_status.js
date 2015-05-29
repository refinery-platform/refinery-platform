angular.module('refineryExternalToolStatus', [])

.factory("externalToolStatusFactory", function($resource) {
  'use strict';
  return $resource('/api/v1/externaltoolstatus/', {format: 'json'});
})

.service("externalToolStatusService", function(){
    vm = this;
    var tools_details = [
        {"name": "SOLR", "status": "N/A", "last_time_check": "N/A", "is_active":"N/A"},
        {"name": "CELERY", "status": "N/A", "last_time_check": "N/A", "is_active":"N/A"},
        {"name": "GALAXY", "status": "N/A", "last_time_check": "N/A", "is_active":"N/A"}
    ];

    vm.getToolsDetails = function(){
        return tools_details;
    };

    vm.setWhichTool = function(tool_data){
      switch(tool_data.name){
          case "SOLR":
            vm.setToolDetail(0, tool_data);
            break;
          case "CELERY":
            vm.setToolDetail(1, tool_data);
              break;
          case "GALAXY":
            vm.setToolDetail(2, tool_data);
              break;
          default:
              console.log("Additional external tools data available: " + tool_data);
              break;
      }
  };
    vm.setToolDetail = function(ind, tool_data){
      tools_details[ind].status=tool_data.status;
      tools_details[ind].last_time_check=tool_data.last_time_check;
      tools_details[ind].is_active=tool_data.is_active;
    };
})

.controller('ExternalToolStatusController', function(
    externalToolStatusFactory, externalToolStatusService, $scope, $timeout, $log) {
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
})

.directive('externaltoolstatus', function($log) {
  return {
    templateUrl: '/static/partials/external_tool_status.tpls.html',
    restrict: 'A',
  };
})

.directive('externaltoolstatusdetails', function($log) {
  return {
    restrict: 'E',
    templateUrl: '/static/partials/external_tool_status_details.tpls.html',
    scope: {
       tools_details: '@'
    },
    controller: 'ExternalToolStatusController',
    controllerAs: 'externalToolStatusController',
    bindToController: true,
  };
})

.directive('externaltoolstatusdetailspopover', function($log) {
  return {
    restrict: 'E',
    templateUrl: '/static/partials/external_tool_status_details_popover.tpls.html',
    scope: {
       tools_details: '@'
    },
    controller: 'ExternalToolStatusController',
    controllerAs: 'externalToolStatusController',
    bindToController: true,
  };
})

.directive('externaltoolpopover', function ($compile,$templateCache) {
    return {
        restrict: "AE",

        link: function (scope, element, attrs) {
            var template = $templateCache.get("externaltool.html");
            var popOverContent = $compile(template)(scope);

            var options = {
                content: popOverContent,
                placement: "bottom",
                html: true,
                date: scope.date,
                trigger: "hover"
            };
            $(element).popover(options);
        }
    };
});
