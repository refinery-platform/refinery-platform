(function () {
  'use strict';

  describe('Controller: Input Control Inner Nav Ctrl', function () {
    var ctrl;
    var fileService;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (
      $rootScope,
      $controller,
      fileRelationshipService
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('InputControlInnerNavCtrl', {
        $scope: scope
      });
      fileService = fileRelationshipService;
    }));

    it('Input Group ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.currentGroup).toEqual([]);
      expect(ctrl.currentTypes).toEqual([]);
      expect(ctrl.inputFileTypes).toEqual([]);
    });

    it('Validation method should exist for views', function () {
      expect(angular.isFunction(ctrl.needMoreNodes)).toBe(true);
    });

    describe('navLeft from Ctrl', function () {
      it('navLeft is method', function () {
        expect(angular.isFunction(ctrl.navRight)).toBe(true);
      });

      it('decreases current group by one', function () {
        fileService.currentGroup = angular.copy([0, 1]);
        ctrl.navLeft(1);
        expect(ctrl.currentGroup).toEqual([0, 0]);
      });
    });

    describe('navRight from Ctrl', function () {
      it('navRight is method', function () {
        expect(angular.isFunction(ctrl.navRight)).toBe(true);
      });

      it('increases current group by one', function () {
        fileService.currentGroup = angular.copy([0, 0]);
        ctrl.navRight(1);
        expect(ctrl.currentGroup).toEqual([0, 1]);
      });
    });
  });
})();
