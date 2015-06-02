angular.module('refineryExternalToolStatus')
    .service("externalToolStatusService", externalToolStatusService);

function externalToolStatusService(){
  var vm = this;
  vm.toolDetails = {};

  vm.getToolsDetails = function(){
    vm.toolDetails = [
      {"name": "SOLR", "status": "N/A", "last_time_check": "N/A", "is_active":"N/A"},
      {"name": "CELERY", "status": "N/A", "last_time_check": "N/A", "is_active":"N/A"},
      {"name": "GALAXY", "status": "N/A", "last_time_check": "N/A", "is_active":"N/A"}
    ];
    return vm.toolDetails;
  };

  vm.setWhichTool = function(toolData){
    switch(toolData.name){
      case "SOLR":
        vm.setToolDetail(0, toolData);
        break;
      case "CELERY":
        vm.setToolDetail(1, toolData);
          break;
      case "GALAXY":
        vm.setToolDetail(2, toolData);
          break;
      default:
          console.log("Additional external tools data available: " + toolData);
          break;
    }
  };
  vm.setToolDetail = function(ind, toolData){
    vm.toolDetails[ind].status=toolData.status;
    vm.toolDetails[ind].last_time_check=toolData.last_time_check;
    vm.toolDetails[ind].is_active=toolData.is_active;
  };
};