angular.module('refineryExternalToolStatus')
    .controller('ExternalToolStatusController',
    ['externalToolStatusFactory', '$scope', '$timeout', '$log', ExternalToolStatusController]);


function ExternalToolStatusController(
    externalToolStatusFactory, $scope, $timeout, $log) {
    "use strict";
  var vm = this;
  vm.tools = externalToolStatusFactory.tools;
  vm.tools_details = externalToolStatusFactory.toolsDetails;

  var setSystemStatus = function(status){
    if (status === "OK") {
      $scope.systemStatusOk = true;
      $scope.systemStatusWarning = false;
      $scope.systemStatusError = false;
      $scope.systemStatusUnknown = false;
    }
    else if (status === "WARNING") {
      $scope.systemStatusOk = false;
      $scope.systemStatusWarning = true;
      $scope.systemStatusError = false;
      $scope.systemStatusUnknown = false;
    }
    else if (status === "ERROR") {
      $scope.systemStatusOk = false;
      $scope.systemStatusWarning = false;
      $scope.systemStatusError = true;
      $scope.systemStatusUnknown = false;
    }
    else if (status === "UNKNOWN") {
      $scope.systemStatusOk = false;
      $scope.systemStatusWarning = false;
      $scope.systemStatusError = false;
      $scope.systemStatusUnknown = true;
    }
  };

  (function tick() {

    externalToolStatusFactory.getTools();

    $scope.isSolrUp = externalToolStatusFactory.isSolrUp();
    $scope.isCeleryUp = externalToolStatusFactory.isCeleryUp();
    $scope.isGalaxyUp = externalToolStatusFactory.isGalaxyUp();

    var toolStatus = externalToolStatusFactory.getSystemStatus();
    setSystemStatus(toolStatus);

    $timeout(tick, 1000);
  })();

}