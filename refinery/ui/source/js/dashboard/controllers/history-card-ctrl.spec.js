(function () {
  'use strict';

  describe('Controller: HistoryCardCtrl Ctrl', function () {
    var ctrl;
    var mockResponseData;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDashboard'));
    beforeEach(inject(function (
      $controller,
      toolsService,
      $q,
      $rootScope
    ) {
      scope = $rootScope.$new();
      mockResponseData = [{ name: 'Test tool' }];

      spyOn(toolsService, 'query').and.callFake(function () {
        var deferred = $q.defer();
        deferred.resolve(mockResponseData);
        return { $promise: deferred.promise };
      });

      ctrl = $controller('HistoryCardCtrl', {
        $scope: scope
      });
    }));

    it('HistoryCardCtrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('variables should be initialized', function () {
      expect(ctrl.isToolsLoading).toEqual(true);
      expect(ctrl.tools).toEqual([]);
    });

    describe('getUserTools', function () {
      it('getUserTools is a method', function () {
        expect(angular.isFunction(ctrl.getUserTools)).toBe(true);
      });

      it('getUserTools updates tools list', function () {
        ctrl.getUserTools();
        scope.$apply();
        expect(ctrl.tools[0].name).toEqual(mockResponseData[0].name);
      });

      it('getUserTools updates isToolLoading variable', function () {
        expect(ctrl.isToolsLoading).toEqual(true);
        ctrl.getUserTools();
        scope.$apply();
        expect(ctrl.isToolsLoading).toEqual(false);
      });
    });
  });
})();
