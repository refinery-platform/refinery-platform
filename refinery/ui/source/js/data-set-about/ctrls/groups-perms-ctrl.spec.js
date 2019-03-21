(function () {
  'use strict';
  describe('Controller: GroupPermsCtrl', function () {
    var ctrl;
    var scope;
    var factory;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDataSetAbout'));
    beforeEach(inject(function (
      $rootScope,
      $controller,
      dataSetGroupPermsService
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('GroupPermsCtrl', {
        $scope: scope
      });
      factory = dataSetGroupPermsService;
    }));

    it('GroupPermsCtrl ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.groupList).toEqual([]);
    });

    describe('refreshDataSetGroups', function () {
      it('refreshDataSetGroups is method', function () {
        expect(angular.isFunction(ctrl.refreshDataSetGroups)).toBe(true);
      });

      it('refreshDataSetGroups returns calls Factory and updates mock item', function () {
        var mockDataSets = false;
        spyOn(factory, 'getDataSetGroupPerms').and.callFake(function () {
          return {
            then: function () {
              mockDataSets = true;
            }
          };
        });
        expect(mockDataSets).toEqual(false);
        ctrl.refreshDataSetGroups();
        expect(mockDataSets).toEqual(true);
      });
    });
  });
})();
