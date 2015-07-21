angular.module('refineryAnalyses')
    .service("analysesAlertService", ['analysesFactory', analysesAlertService]);

function analysesAlertService(analysesFactory) {
  var vm = this;
  var analysesMsg = {};
  analysesMsg.status = "";
  analysesMsg.name = "";

  vm.setAnalysesMsg = function (uuid) {
     vm.findAnalysesAlertStatus(uuid);
  };

  vm.getAnalysesMsg = function(){
    return analysesMsg;
  };

  vm.findAnalysesAlertStatus = function(uuid){
    var copyAnalysesList =  analysesFactory.analysesList;
    for(var i = 0; i<copyAnalysesList.length; i++){
      if(uuid === copyAnalysesList[i].uuid){
       analysesMsg.status=copyAnalysesList[i].status;
       analysesMsg.name=copyAnalysesList[i].name;
        break;
      }
    }
  };
}
