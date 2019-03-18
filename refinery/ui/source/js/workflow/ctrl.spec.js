(function () {
  'use strict';

  describe('Controller: Workflow Graph Ctrl', function () {
    var ctrl;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryWorkflow'));
    beforeEach(inject(function (
      $rootScope,
      $controller,
      settings
    ) {
      settings.djangoApp = { workflowUuid: '' }; // empty str to avoid graph generation
      scope = $rootScope.$new();
      ctrl = $controller('WorkflowGraphCtrl', {
        $scope: scope
      });
    }));

    it('Workflow graph ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('View variables should exist for views', function () {
      expect(ctrl.workflowUuid).toEqual('');
      expect(ctrl.workflowGraph.selected).toEqual('cb_layout_kind_refinery');
    });

    it('View methods should exist for views', function () {
      expect(angular.isFunction(ctrl.reloadWorkflow)).toBe(true);
    });
  });
})();
