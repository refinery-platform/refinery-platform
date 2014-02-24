angular.module('refineryWorkflows', [])

.controller('WorkflowListApiCtrl', function($scope, $rootScope, $log, workflowApi, workflow) {
  'use strict';

  $scope.getWorkflowList = function() {
    var Workflows = workflowApi.get(function() {
      $scope.workflowList = Workflows.objects;
    });
  };

  $scope.getWorkflowList();

  $scope.currentWorkflow = workflow;

  $scope.updateCurrentWorkflow = function() {
    workflow.set($scope.workflowList[$scope.workflowIndex]);

    if (workflow.isAvailable()) {
      $rootScope.$emit("workflowChangedEvent", workflow.get());
    }
  };

})

.factory("workflowApi", function($resource) {
  'use strict';

  return $resource(
    "/api/v1/workflow/", {format: "json"}
  );
})

.service("workflow", function($log) {
  'use strict';

  this.instance = null;

  this.isAvailable = function() {
    return this.instance ? true : false;
  };

  this.get = function() {
    return this.instance;
  };

  this.set = function(instance) {
    this.instance = instance;
  };

  this.isSingleInput = function() {
    if (this.instance) {
      if (this.getInputSet(2)) {
        return false;
      }
      else {
        return true;
      }
    }
    else {
      // is this necessary?
      return true;
    }
  };

  this.getUuid = function() {
    if (this.isAvailable()) {return this.instance.uuid;}
  };

  this.getSummary = function() {
    if (this.isAvailable()) {return this.instance.summary;}
  };

  this.getName = function() {
    if (this.isAvailable()) {return this.instance.name;}
  };

  this.getCategory = function() {
    if (this.isSingleInput()) {
      return "File Set";
    }
    else {
      return this.instance.input_relationships[0].category + " File Mapping";
    }
  };

  this.getInputSet = function(number) {
    if (this.isAvailable()) {
      switch(number) {
        case 1: return this.instance.input_relationships[0].set1;
        case 2: return this.instance.input_relationships[0].set2;
      }
    }
  };
});
