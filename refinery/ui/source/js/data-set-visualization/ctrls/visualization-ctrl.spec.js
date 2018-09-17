(function () {
  'use strict';

  describe('Controller: Data Set Visualization Ctrl', function () {
    var ctrl;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDataSetVisualization'));
    beforeEach(inject(function (
      $rootScope,
      $controller

    ) {
      scope = $rootScope.$new();
      ctrl = $controller('DataSetVisualizationCtrl', {
        $scope: scope
      });
    }));

    it('Data Set Visualization Ctrl ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.visLoadingFlag).toEqual('LOADING');
      expect(ctrl.visualizations).toEqual([]);
    });
  });
})();
