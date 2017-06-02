(function () {
  'use strict';

  describe('Controller: Input Group Ctrl', function () {
    var ctrl;
    var fakeUuid;
    var fakeUuid2;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (
      $controller,
      mockParamsFactory,
      $rootScope
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('InputGroupCtrl', {
        $scope: scope
      });
      fakeUuid = mockParamsFactory.generateUuid();
      fakeUuid2 = mockParamsFactory.generateUuid();
    }));

    it('Input Group ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.attributes).toEqual({});
      expect(ctrl.currentGroup).toEqual([]);
      expect(ctrl.currentTypes).toEqual([]);
      expect(ctrl.groupCollection).toEqual({});
      expect(ctrl.inputFileTypes).toEqual([]);
      expect(ctrl.inputFileTypeColor).toEqual({});
      expect(ctrl.isNavCollapsed).toEqual(false);
    });

    describe('isGroupPopulated from Ctrl', function () {
      it('isGroupPopulated is method', function () {
        expect(angular.isFunction(ctrl.isGroupPopulated)).toBe(true);
      });

      it('isGroupPopulated returns true', function () {
        ctrl.currentGroup = [0, 0, 0];
        ctrl.groupCollection[ctrl.currentGroup] = {};
        ctrl.groupCollection[ctrl.currentGroup][fakeUuid] = [fakeUuid2];
        expect(ctrl.isGroupPopulated(fakeUuid)).toEqual(true);
      });

      it('isGroupPopulated returns false', function () {
        ctrl.currentGroup = [0, 0, 0];
        ctrl.groupCollection[ctrl.currentGroup] = {};
        ctrl.groupCollection[ctrl.currentGroup][fakeUuid] = [];
        expect(ctrl.isGroupPopulated(fakeUuid)).toEqual(false);
      });
    });

    describe('isObjEmpty from Ctrl', function () {
      it('isObjEmpty is method', function () {
        expect(angular.isFunction(ctrl.isObjEmpty)).toBe(true);
      });

      it('isObjEmpty returns true', function () {
        expect(ctrl.isObjEmpty({})).toEqual(true);
      });

      it('isObjEmpty returns false', function () {
        expect(ctrl.isObjEmpty({ test: '123' })).toEqual(false);
      });
    });
  });
})();
