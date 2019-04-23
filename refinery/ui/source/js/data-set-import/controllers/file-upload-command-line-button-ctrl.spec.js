(function () {
  'use strict';

  describe('Controller: File Upload Command Line Button Ctrl', function () {
    var ctrl;
    var mockModalService;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDataSetImport'));
    beforeEach(inject(function (
      $controller,
      $rootScope,
      $uibModal
    ) {
      scope = $rootScope.$new();
      mockModalService = spyOn($uibModal, 'open');
      ctrl = $controller('FileUploadCommandLineButtonCtrl', {
        $scope: scope
      });
    }));

    it('Command Line Button ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('View method should exist for view', function () {
      expect(angular.isFunction(ctrl.launchCommandLineModal)).toBe(true);
    });

    it('Command calls modal service', function () {
      ctrl.launchCommandLineModal();
      expect(mockModalService).toHaveBeenCalled();
    });
  });
})();
