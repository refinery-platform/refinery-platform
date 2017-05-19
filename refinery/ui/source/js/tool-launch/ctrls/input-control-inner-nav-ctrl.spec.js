(function () {
  'use strict';

  describe('Controller: Input Control Inner Nav Ctrl', function () {
    var ctrl;
    var fileService;
    var mocker;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (
      $rootScope,
      $controller,
      fileRelationshipService,
      mockParamsFactory
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('InputControlInnerNavCtrl', {
        $scope: scope
      });
      fileService = fileRelationshipService;
      mocker = mockParamsFactory;
    }));

    it('Input Group ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.currentGroup).toEqual([]);
      expect(ctrl.currentTypes).toEqual([]);
      expect(ctrl.inputFileTypes).toEqual([]);
    });

    describe('needMoreNodes from Ctrl', function () {
      it('needMoreNodes is method', function () {
        expect(angular.isFunction(ctrl.needMoreNodes)).toBe(true);
      });

      it('needMoreNodes returns false for filled pairs', function () {
        fileService.currentGroup = angular.copy([0, 0]);
        fileService.currentTypes = angular.copy(['LIST', 'PAIR']);
        fileService.groupCollection[ctrl.currentGroup] = angular.copy({});
        fileService.groupCollection[ctrl.currentGroup][mocker.generateUuid()] =
          angular.copy([mocker.generateUuid()]);
        fileService.groupCollection[ctrl.currentGroup][mocker.generateUuid()] =
          angular.copy([mocker.generateUuid()]);
        expect(ctrl.needMoreNodes()).toEqual(false);
      });

      it('needMoreNodes returns false for filled list', function () {
        fileService.currentGroup = angular.copy([0, 0]);
        fileService.currentTypes = angular.copy(['LIST', 'LIST']);
        fileService.groupCollection[ctrl.currentGroup] = angular.copy({});
        fileService.groupCollection[ctrl.currentGroup][mocker.generateUuid()] =
          angular.copy([mocker.generateUuid()]);
        expect(ctrl.needMoreNodes()).toEqual(false);
      });

      it('needMoreNodes returns true if currentGroup is empty', function () {
        // default is empty
        expect(ctrl.needMoreNodes()).toEqual(true);
      });

      it('needMoreNodes returns true for partial filled pair - input type', function () {
        fileService.currentGroup = angular.copy([0, 0]);
        fileService.currentTypes = angular.copy(['LIST', 'PAIR']);
        fileService.groupCollection[ctrl.currentGroup] = angular.copy({});
        fileService.groupCollection[ctrl.currentGroup][mocker.generateUuid()] =
          angular.copy([mocker.generateUuid()]);
        expect(ctrl.needMoreNodes()).toEqual(true);
      });

      it('needMoreNodes returns true for partial filled pair - missing node', function () {
        fileService.currentGroup = angular.copy([0, 0]);
        fileService.currentTypes = angular.copy(['LIST', 'PAIR']);
        fileService.groupCollection[ctrl.currentGroup] = angular.copy({});
        fileService.groupCollection[ctrl.currentGroup][mocker.generateUuid()] =
          angular.copy([mocker.generateUuid()]);
        fileService.groupCollection[ctrl.currentGroup][mocker.generateUuid()] = angular.copy([]);
        expect(ctrl.needMoreNodes()).toEqual(true);
      });

      it('needMoreNodes returns true for partial filled list - missing node', function () {
        fileService.currentGroup = angular.copy([0, 0]);
        fileService.currentTypes = angular.copy(['LIST', 'LIST']);
        fileService.groupCollection[ctrl.currentGroup] = angular.copy({});
        fileService.groupCollection[ctrl.currentGroup][mocker.generateUuid()] = angular.copy([]);
        expect(ctrl.needMoreNodes()).toEqual(true);
      });
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
