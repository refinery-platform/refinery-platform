angular.module('refineryAnalysisMonitor')
    .service("analysisMonitorAlertService", ['analysisMonitorFactory', 'analysisService', analysisMonitorAlertService]);

function analysisMonitorAlertService(analysisMonitorFactory, analysisService) {
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
    var analysis = analysisService.query({
      format:'json', limit: 1, 'uuid': uuid
    });

    analysis.$promise.then(function(response){
      analysesMsg.status=response.objects[0].status;
      analysesMsg.name=response.objects[0].name;
    }, function(error){
      console.log(error);
    });
  };
}
