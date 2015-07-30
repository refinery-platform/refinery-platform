angular.module('refineryAnalyses')
    .service("analysesAlertService", ['analysesFactory', analysesAlertService]);

function analysesAlertService(analysesFactory) {
  var vm = this;
  var analysesMsg = {};
  analysesMsg.status = "";
  analysesMsg.name = "";

  vm.setAnalysesMsg = function (uuid) {
     vm.updateAnalysesAlertStatus(uuid);
  };

  vm.getAnalysesMsg = function(){
    return analysesMsg;
  };

  vm.updateAnalysesAlertStatus = function(uuid){
    analysesFactory.getAnalysesOne(uuid).then(function(){
      analysesMsg.status=analysesFactory.analysesOne[0].status;
      analysesMsg.name=analysesFactory.analysesOne[0].name;
    });
  };
}
