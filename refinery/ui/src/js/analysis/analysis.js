angular.module('refineryAnalysis')

.controller('AnalysisCtrl', function(
    $scope, $rootScope, $http, $window, $log, $timeout, workflow) {
    "use strict";

    var vm = this;

  $scope.analysisConfig = {
    studyUuid: $window.externalStudyUuid,
    workflowUuid: null,
    nodeSetUuid: null,
    nodeRelationshipUuid: null,
    name: null,
  };

  $scope.$onRootScope('nodeSetChangedEvent', function(event, currentNodeSet) {
    $scope.analysisConfig.nodeSetUuid = currentNodeSet.uuid;
    $scope.analysisConfig.nodeRelationshipUuid = null;
    $log.debug("new nodeset: " + $scope.analysisConfig.nodeSetUuid);
  });

  $scope.$onRootScope('nodeRelationshipChangedEvent', function(event, currentNodeRelationship) {
    if (!currentNodeRelationship) {
      $scope.analysisConfig.nodeRelationshipUuid = null;
      $log.debug("new noderel undefined");
    }
    else {
      $scope.analysisConfig.nodeRelationshipUuid = currentNodeRelationship.uuid;
      $log.debug("new noderel: " + $scope.analysisConfig.nodeRelationshipUuid);
    }

    $scope.analysisConfig.nodeSetUuid = null;
  });

  $scope.setAnalysisName = function() {
    var timeStamp = vm.getTimeStamp();
    var workflowUuid = workflow.getName();
    var tempName = workflowUuid + " " + timeStamp;
    //bootbox.prompt("Enter an Analysis Name", "Cancel Analysis", "Launch" +
    //  " Analysis", function(name) {
    //  if (name !== null) {
    //    var prom = vm.launchAnalysis(name);
    //  }
    //}, tempName).addClass("bootboxAnalysisWidth");

    bootbox.prompt(
      "Enter an Analysis Name",
      "Cancel Analysis",
      "Launch Analysis",
      function(name) {
        if (name !== null) {
          vm.launchAnalysis(name).then(function (response) {
            var msg = "<h3> Analysis Launched.</h3>" +
          "<p>View progess in Analyses Tab.</p>";

            vm.bootboxDialog(msg);
            //  console.log(response);
          }, function (error) {
            var msg = "<h3> Analysis launch failed.</h3>" +
         "<p>Please check galaxy history.</p>";
            vm.bootboxDialog(msg);
          });
        }
      },
      tempName
      ).addClass("bootboxAnalysisWidth");

  };

  vm.launchAnalysis = function(analysisName) {
    $scope.analysisConfig.name = analysisName;
    $scope.analysisConfig.workflowUuid = workflow.getUuid();
    return(
      $http({
        method: 'POST',
        url: '/analysis_manager/run/',
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        data: $scope.analysisConfig,
      }).success(function (response) {
        $log.debug("Launching analysis with config:");
        $log.debug("Workflow: " + $scope.analysisConfig.workflowUuid);
        $log.debug("NodeSET: " + $scope.analysisConfig.nodeSetUuid);
        $log.debug("NodeREL: " + $scope.analysisConfig.nodeRelationshipUuid);
      //  $window.location.assign(response);
      //  var msg = "<h3> Analysis Launched.</h3>" +
      //    "<p>View progess in Analyses Tab.</p>";
       //   vm.bootboxDialog(msg);
         $rootScope.$broadcast('rf/launchAnalysis');
      }).error(function (response, status) {
        $log.debug("Request failed: error " + status);
        //var msg = "<h3> Analysis launch failed.</h3>" +
        // "<p>Please check galaxy history.</p>";
       //   vm.bootboxDialog(msg);
      })
    );
  };

  $scope.showModal = false;
  $scope.toggleModal = function(){
      $scope.showModal = !$scope.showModal;
  };

  vm.bootboxDialog = function( msg){
    console.log(msg);
    bootbox.dialog(msg, [{
      "label" : "Close",
    }, {
      "label" : "View Analysis",
      "class" : "btn-primary",
      "callback": function() {
        $window.location.href = '/data_sets/' + dataSetUuid + '/#/analyses';
      }
    }],{
      "animate": false
    });
  };

  vm.getTimeStamp = function(){
    var currentDate = new Date();
    var month = currentDate.getMonth() + 1;
    var day = currentDate.getDate();
    var year = currentDate.getFullYear();
    var hour = currentDate.getHours();
    var mins= currentDate.getMinutes();
    var sec = currentDate.getSeconds();

    if(mins < 10){
      mins = "0" + mins;
    }

    if(sec < 10){
      sec = "0" + sec;
    }

    var dateStr = year + "-" + month + "-" + day;
    var timeStr = "@" + hour + ":" + mins + ":" + sec;

    return (dateStr + timeStr);

  };
});
