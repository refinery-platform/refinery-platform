'use strict';

function analysisMonitorAlertService ($q, analysisService) {
  var vm = this;
  var analysesMsg = {};
  analysesMsg.status = '';
  analysesMsg.name = '';

  vm.setAnalysesMsg = function (uuid) {
    vm.refreshAnalysesAlertStatus(uuid);
  };

  vm.getAnalysesMsg = function () {
    return analysesMsg;
  };

  vm.refreshAnalysesAlertStatus = function (uuid) {
    var deferred = $q.defer();
    var analysis = analysisService.query({
      format: 'json',
      limit: 1,
      uuid: uuid
    });

    analysis.$promise.then(function (response) {
      if (response && response.total_count > 0) {
        analysesMsg.status = response.objects[0].status;
        analysesMsg.name = response.objects[0].name;
        deferred.resolve(response);
      } else {
        deferred.reject(
          'Analyses seems to be broken. The API does not know it.'
        );
      }
    });

    return deferred.promise;
  };
}

angular
  .module('refineryAnalysisMonitor')
  .service('analysisMonitorAlertService', [
    '$q',
    'analysisService',
    analysisMonitorAlertService
  ]);
