(function () {
  'use strict';

  describe('Controller: UserFileBrowserFiltersCtrl', function () {
    var ctrl;
    var factory;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryUserFileBrowser'));
    beforeEach(inject(function (
      $controller,
      $rootScope,
      $window,
      settings,
      userFileBrowserFactory
    ) {
      factory = userFileBrowserFactory;
      scope = $rootScope.$new();
      settings.djangoApp.userFilesColumns = '';

      ctrl = $controller('UserFileBrowserFiltersCtrl', {
        $scope: scope
      });
    }));

    it('ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('view variables should be initialized', function () {
      expect(ctrl.attributeFilters).toEqual([]);
      expect(ctrl.foldedDown).toEqual({});
      expect(ctrl.orderColumns).toEqual('');
    });

    it('watches factory attributeFilters and updates', function () {
      var mockAttributes = [{ name: 'Test Attribute' }];
      angular.copy(mockAttributes, factory.attributeFilters);
      expect(ctrl.attributeFilters).toEqual(mockAttributes);
    });
  });
})();
