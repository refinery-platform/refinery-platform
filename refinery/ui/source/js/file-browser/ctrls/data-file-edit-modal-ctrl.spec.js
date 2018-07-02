(function () {
  'use strict';

  describe('Controller: DataFileEditModalCtrl', function () {
    var scope;
    var ctrl;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function (
      $componentController,
      $rootScope,
      settings
    ) {
      settings.djangoApp = { deploymentPlatform: '' };
      scope = $rootScope.$new();
      ctrl = $componentController(
        'rpDataFileEditModal',
        { $scope: scope },
        { resolve: { config: { nodeObj: { REFINERY_DOWNLOAD_URL_s: 'www.mock-url.com' } } } }
      );
    }));

    it('DataFileEditModalCtrl ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.alertType).toEqual('info');
      expect(ctrl.isLoading).toEqual(false);
    });

    it('Helper Methods exist', function () {
      expect(angular.isFunction(ctrl.close)).toBe(true);
    });

    describe('Test addFile', function () {
      it('addFile is method', function () {
        expect(angular.isFunction(ctrl.addFile)).toBe(true);
      });
    });

    describe('Test removeFile', function () {
      it('removeFile is method', function () {
        expect(angular.isFunction(ctrl.removeFile)).toBe(true);
      });
    });
  });
})();
