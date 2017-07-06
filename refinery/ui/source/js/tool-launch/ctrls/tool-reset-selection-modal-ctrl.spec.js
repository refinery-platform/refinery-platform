(function () {
  'use strict';

  describe('Controller: Tool Select Ctrl', function () {
    var ctrl;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (
      $rootScope,
      $controller
    ) {
      scope = $rootScope.$new();
      var selectedTool = { select: {} };
      var $uibModalInstance = {
        cancel: function () {},
        close: function () {}
      };
      ctrl = $controller('ToolResetSelectionModalCtrl', {
        $scope: scope,
        selectedTool: selectedTool,
        $uibModalInstance: $uibModalInstance
      });
    }));

    it('Tool Reset Selection Modal ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Helper methods are method', function () {
      expect(angular.isFunction(ctrl.cancel)).toBe(true);
      expect(angular.isFunction(ctrl.confirm)).toBe(true);
    });
  });
})();
