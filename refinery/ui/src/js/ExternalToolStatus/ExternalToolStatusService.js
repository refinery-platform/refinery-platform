angular.module('refineryExternalToolStatus')
    .service("externalToolStatusService", externalToolStatusService);

function externalToolStatusService(){
    var vm = this;
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
}