'use strict';

angular
  .module('refineryWorkflows', [])
  .controller('WorkflowListApiCtrl', [
    '$scope',
    '$rootScope',
    '$log',
    'workflowApi',
    'workflow',
    function ($scope, $rootScope, $log, workflowApi, workflow) {
      $scope.getWorkflowList = function () {
        var Workflows = workflowApi.get(function () {
          $scope.workflowList = Workflows.objects;
        });
      };

      $scope.getWorkflowList();

      $scope.currentWorkflow = workflow;

      $scope.updateCurrentWorkflow = function () {
        workflow.set($scope.workflowList[$scope.workflowIndex]);

        if (workflow.isAvailable()) {
          $rootScope.$emit('workflowChangedEvent', workflow.get());
        }
      };
    }
  ])
  .factory('workflowApi', ['$resource', function ($resource) {
    return $resource(
      '/api/v1/workflow/', {
        format: 'json'
      }
    );
  }])
  .service('workflow', [function () {
    this.instance = null;

    this.isAvailable = function () {
      return !!this.instance;
    };

    this.get = function () {
      return this.instance;
    };

    this.set = function (instance) {
      this.instance = instance;
    };

    this.isSingleInput = function () {
      if (this.instance && this.getInputSet(2)) {
        return false;
      }
      return true;
    };

    this.getUuid = function () {
      if (this.isAvailable()) {
        return this.instance.uuid;
      }
      return undefined;
    };

    this.getSummary = function () {
      if (this.isAvailable()) {
        return this.instance.summary;
      }
      return undefined;
    };

    this.getName = function () {
      if (this.isAvailable()) {
        return this.instance.name;
      }
      return undefined;
    };

    this.getCategory = function () {
      if (this.isSingleInput()) {
        return 'File Set';
      }
      return this.instance.input_relationships[0].category + ' File Mapping';
    };

    this.getInputSet = function (number) {
      if (this.isAvailable()) {
        switch (number) {
          case 1:
            return this.instance.input_relationships[0].set1;
          case 2:
            return this.instance.input_relationships[0].set2;
          default:
            return undefined;
        }
      }
      return undefined;
    };

    this.getGalaxyInstanceId = function () {
      if (this.isAvailable()) {
        return this.instance.galaxy_instance_identifier;
      }
      return undefined;
    };
  }]);
