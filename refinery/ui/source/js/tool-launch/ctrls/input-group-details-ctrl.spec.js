(function () {
  'use strict';

  describe('Controller: Input Group Details Ctrl', function () {
    var ctrl;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (
      $controller,
      $rootScope
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('InputGroupDetailsCtrl', {
        $scope: scope
      });
    }));

    it('Input Group ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.attributes).toEqual({});
      expect(ctrl.collapseDetails).toEqual(true);
      expect(ctrl.currentGroup).toEqual([]);
      expect(ctrl.currentTypes).toEqual([]);
      expect(ctrl.groupCollection).toEqual({});
      expect(ctrl.inputFileTypes).toEqual([]);
      expect(ctrl.inputFileTypeColor).toEqual({});
    });

    describe('toggleCollapseDetails from Ctrl', function () {
      it('toggleCollapseDetails is method', function () {
        expect(angular.isFunction(ctrl.toggleCollapseDetails)).toBe(true);
      });

      it('toggleCollapseDetails sets true', function () {
        ctrl.collapseDetails = false;
        expect(ctrl.toggleCollapseDetails()).toEqual(true);
      });

      it('toggleCollapseDetails sets false', function () {
        expect(ctrl.toggleCollapseDetails()).toEqual(false);
      });
    });
  });
})();
