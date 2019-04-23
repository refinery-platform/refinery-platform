(function () {
  'use strict';

  describe('Controller: File Upload Command Line Modal Ctrl', function () {
    var ctrl;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDataSetImport'));
    beforeEach(inject(function (
      $controller,
      $rootScope
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('FileUploadCommandLineModalCtrl', {
        $scope: scope
      });
    }));

    it('Command Line Modal ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('View method should exist for view', function () {
      expect(angular.isFunction(ctrl.close)).toBe(true);
    });
  });
})();
