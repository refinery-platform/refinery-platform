(function () {
  'use strict';

  describe('Controller: Input Group Help Popover Ctrl', function () {
    var ctrl;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (
      $controller,
      $rootScope
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('InputGroupHelpPopoverCtrl', {
        $scope: scope
      });
    }));

    it('Input Group ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.displayInputFile).toEqual({});
      expect(ctrl.inputFileTypes).toEqual([]);
      expect(ctrl.inputFileTypeColor).toEqual({});
    });
  });
})();
