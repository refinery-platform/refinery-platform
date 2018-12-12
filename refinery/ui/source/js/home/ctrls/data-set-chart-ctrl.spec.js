(function () {
  'use strict';

  describe('Controller: Data Set Chart Ctrl', function () {
    var ctrl;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryHome'));
    beforeEach(inject(function (
      $rootScope,
      $controller
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('DataSetChartCtrl', {
        $scope: scope
      });
    }));

    it('DataSetChartCtrl ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('initializes view data', function () {
      expect(ctrl.selectedAttribute.select.name).toBeDefined('Filetype');
      expect(ctrl.attributes).toEqual([]);
    });

    it('view methods should exist', function () {
      expect(ctrl.updateAttribute).toBeDefined();
    });
  });
})();
