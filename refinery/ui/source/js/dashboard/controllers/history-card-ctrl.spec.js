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
      eventsService,
      $q,
      $rootScope
    ) {
      scope = $rootScope.$new();
      mockResponseData = [{ name: 'Test tool' }];

      spyOn(eventsService, 'query').and.callFake(function () {
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
      expect(ctrl.events).toEqual([]);
    });

    describe('getUserEvents', function () {
      it('getUserEvents is a method', function () {
        expect(angular.isFunction(ctrl.getUserEvents)).toBe(true);
      });

      it('getUserEvents updates tools list', function () {
        ctrl.getUserEvents();
        scope.$apply();
        expect(ctrl.events[0].name).toEqual(mockResponseData[0].name);
      });
    });
  });
})();
