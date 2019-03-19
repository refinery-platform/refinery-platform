(function () {
  'use strict';

  describe('Controller: Input Control Ctrl', function () {
    var ctrl;
    var permsService;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function (
      $rootScope,
      $controller,
      dataSetGroupPermsService
    ) {
      permsService = dataSetGroupPermsService;
      scope = $rootScope.$new();
      ctrl = $controller('UserPermsIconCtrl', {
        $scope: scope
      });
      spyOn(permsService, 'getDataSetGroupPerms');
    }));

    it('User Perms Icon Ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data variables should exist', function () {
      expect(ctrl.userPerms).toEqual('none');
    });
  });
})();
