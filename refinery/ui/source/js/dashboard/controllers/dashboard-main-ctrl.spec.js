(function () {
  'use strict';

  describe('Controller: Dashboard Main Ctrl', function () {
    var ctrl;
    var groupService;
    var mockResponseData;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDashboard'));
    beforeEach(inject(function (
      $controller,
      groupMemberService,
      $q,
      $rootScope
    ) {
      scope = $rootScope.$new();
      groupService = groupMemberService;
      mockResponseData = [{ name: 'Test Group' }];

      spyOn(groupService, 'query').and.callFake(function () {
        var deferred = $q.defer();
        deferred.resolve(mockResponseData);
        return { $promise: deferred.promise };
      });

      ctrl = $controller('DashboardMainCtrl', {
        $scope: scope
      });
    }));

    it('Dashboard Main ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Variables should be initialized', function () {
      expect(ctrl.groups).toEqual([]);
      expect(ctrl.groupInvites).toEqual({});
    });

    describe('getGroups', function () {
      it('getGroups is a method', function () {
        expect(angular.isFunction(ctrl.getGroups)).toBe(true);
      });

      it('getGroups returns a promise', function () {
        var successData;
        var response = ctrl.getGroups().then(function (responseData) {
          successData = responseData[0].name;
        });
        scope.$apply();
        expect(typeof response.then).toEqual('function');
        expect(successData).toEqual(mockResponseData[0].name);
      });
    });
  });
})();
