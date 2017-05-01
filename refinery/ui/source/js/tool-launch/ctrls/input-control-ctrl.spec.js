(function () {
  'use strict';

  describe('Controller: Input Control Ctrl', function () {
    var ctrl;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (
      $rootScope,
      $controller
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('InputControlCtrl', {
        $scope: scope
      });
    }));

    it('Input Group ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.attributes).toEqual({});
      expect(ctrl.currentGroup).toEqual([]);
      expect(ctrl.currentTypes).toEqual([]);
      expect(ctrl.inputFileTypes).toEqual([]);
    });
  });
})();
