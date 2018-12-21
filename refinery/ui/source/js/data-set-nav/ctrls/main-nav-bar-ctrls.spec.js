(function () {
  'use strict';

  describe('Controller: Main Nav Bar Ctrl', function () {
    var ctrl;
    var scope;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDataSetNav'));
    beforeEach(inject(function (
      $rootScope,
      $controller,
      currentUserService
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('MainNavBarCtrl', {
        $scope: scope
      });
      service = currentUserService;
    }));

    it('Main Nav Bar ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.path).toEqual('');
      expect(ctrl.currentUser).toEqual(service.currentUser);
      expect(ctrl.userProfileUUID).toEqual('');
      expect(ctrl.fullName).toEqual(' ');
      expect(ctrl.userName).toEqual('');
    });
  });
})();
