'use strict';

describe('Controller: WorkflowListApiCtrl', function () {
  var ctrl;
  var scope;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryWorkflows'));
  beforeEach(inject(function (
    $rootScope,
    $controller
  ) {
    scope = $rootScope.$new();
    ctrl = $controller('WorkflowListApiCtrl', {
      $scope: scope
    });
  }));

  it('WorkflowListApiCtrl ctrl should exist', function () {
    expect(ctrl).toBeDefined();
  });

  it('Data & UI displays variables should exist for views', function () {
    expect(ctrl.workflowList).toEqual([]);
  });

  it('Helper methods are method', function () {
    expect(angular.isFunction(ctrl.getWorkflowList)).toBe(true);
    expect(angular.isFunction(ctrl.updateCurrentWorkflow)).toBe(true);
  });
});
