(function () {
  'use strict';

  describe('Controller: PrimaryGroupButtonCtrl', function () {
    var $ctrl;
    var spyParentFilter;
    var scope;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDashboard'));
    beforeEach(inject(function (
      $componentController,
      $rootScope,
      primaryGroupService
    ) {
      scope = $rootScope.$new();

      $ctrl = $componentController('rpPrimaryGroupButton', { $scope: scope });
      $ctrl.filterCtrl = $componentController('rpDataSetsCard', { $scope: scope });
      spyParentFilter = spyOn($ctrl.filterCtrl, 'filterDataSets');
      service = primaryGroupService;
    }));

    it('PrimaryGroupButtonCtrl should exist', function () {
      expect($ctrl).toBeDefined();
    });

    it('variables should be initialized', function () {
      expect($ctrl.primaryGroupButton.selected).toEqual(false);
    });

    describe('filterDataSet', function () {
      it('filterDataSet is a method', function () {
        expect(angular.isFunction($ctrl.filterDataSet)).toBe(true);
      });

      it('filterDataSet toggles selected button true', function () {
        $ctrl.primaryGroupButton.selected = false;
        $ctrl.filterDataSet();
        expect($ctrl.primaryGroupButton.selected).toEqual(true);
      });

      it('filterDataSet toggles selected button false', function () {
        $ctrl.primaryGroupButton.selected = true;
        $ctrl.filterDataSet();
        expect($ctrl.primaryGroupButton.selected).toEqual(false);
      });

      it('filterDataSet calls on spy', function () {
        $ctrl.filterDataSet();
        expect(spyParentFilter).toHaveBeenCalled();
      });

      it('filterDataSet updates parents selected name with All', function () {
        $ctrl.primaryGroupButton.selected = true;
        $ctrl.filterDataSet();
        expect($ctrl.filterCtrl.groupFilter.selectedName).toEqual('All');
      });

      it('filterDataSet updates parents selected name with pg name', function () {
        var groupName = 'Park Lab';
        $ctrl.primaryGroupButton.selected = false;
        $ctrl.primaryGroup.name = groupName;
        $ctrl.filterDataSet();
        expect($ctrl.filterCtrl.groupFilter.selectedName).toEqual(groupName);
      });
    });

    describe('updatePrimaryGroup', function () {
      it('updatePrimaryGroup is a method', function () {
        expect(angular.isFunction($ctrl.filterDataSet)).toBe(true);
      });

      it('updatePrimaryGroup calls on correct service', function () {
        var mockResponse = false;
        var serviceMock = spyOn(service, 'setPrimaryGroup').and.callFake(function () {
          return {
            then: function () {
              mockResponse = true;
            }
          };
        });
        var group = { name: 'Test Group', id: 102 };
        $ctrl.updatePrimaryGroup(group);
        expect(serviceMock).toHaveBeenCalled();
        expect(mockResponse).toEqual(true);
      });
    });
  });
})();
