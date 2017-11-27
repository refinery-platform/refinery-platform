(function () {
  'use strict';

  describe('Controller: Sharing Helop Popover Details Ctrl', function () {
    var ctrl;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(inject(function (
      $rootScope,
      $controller
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('SharingHelpPopoverDetailsCtrl', {
        $scope: scope
      });
    }));

    it('Sharing Help Popover Details ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.isCollaborationPage).toEqual(false);
    });
  });
})();
