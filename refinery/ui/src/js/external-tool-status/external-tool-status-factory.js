angular.module('refineryExternalToolStatus')
    .factory("externalToolStatusFactory", ['$http', externalToolStatusFactory]);

function externalToolStatusFactory($http) {
  "use strict";
  var serverUrl = "/api/v1/externaltoolstatus/";
  var toolsDetails = [
      {"name": "SOLR", "status": "N/A", "last_time_check": "N/A", "is_active":"N/A"},
      {"name": "CELERY", "status": "N/A", "last_time_check": "N/A", "is_active":"N/A"},
      {"name": "GALAXY", "status": "N/A", "last_time_check": "N/A", "is_active":"N/A"}
    ];
  var tools = {};

  var getTools = function() {
    return $http.get(serverUrl).then(function (response) {
      processResponse(response.data.objects);
    }, function (response) {
      tools = {};
      console.error("Error accessing external tool status API.");
    });
  };

  var processResponse = function(objects) {
    for ( var i = 0; i < objects.length; ++i ) {
      setWhichTool(objects[i]);
      tools[objects[i].name] = {};
    }
    for ( i = 0; i < objects.length; ++i ) {
      tools[objects[i].name][objects[i].unique_instance_identifier] = objects[i].status;
    }
  };

  var setWhichTool = function(toolData){
    switch(toolData.name){
      case "SOLR":
        setToolDetail(0, toolData);
        break;
      case "CELERY":
        setToolDetail(1, toolData);
          break;
      case "GALAXY":
        setToolDetail(2, toolData);
          break;
      default:
          console.log("Additional external tools data available: " + toolData);
          break;
    }
  };

  var setToolDetail = function(ind, toolData){
    toolsDetails[ind].status = toolData.status;
    toolsDetails[ind].last_time_check = toolData.last_time_check;
    toolsDetails[ind].is_active = toolData.is_active;
  };

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

 return{
   tools:tools,
   toolsDetails: toolsDetails,
   getTools: getTools,
   getSystemStatus: getSystemStatus,
   isCeleryUp: isCeleryUp,
   isGalaxyUp: isGalaxyUp,
   isSolrUp: isSolrUp,
   isGalaxyInstanceUp: isGalaxyInstanceUp,
   setWhichTool: setWhichTool,
   processResponse: processResponse,
 };
}