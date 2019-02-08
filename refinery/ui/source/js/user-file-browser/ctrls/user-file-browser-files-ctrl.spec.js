(function () {
  'use strict';

  describe('Controller: UserFileBrowserFilesCtrl', function () {
    var ctrl;
    var factory;
    var scope;
    var window;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryUserFileBrowser'));
    beforeEach(module({ $window: { location: { href: '' } } }));
    beforeEach(inject(function (
      $controller,
      $rootScope,
      $window,
      userFileBrowserFactory
    ) {
      factory = userFileBrowserFactory;
      scope = $rootScope.$new();
      window = $window;
      ctrl = $controller('UserFileBrowserFilesCtrl', {
        $scope: scope,
        $window: window
      });
    }));

    it('UserFileBrowserFilesCtrl ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('gridOptions is defined', function () {
      expect(ctrl.gridOptions).toBeDefined();
    });

    it('downloadCsv is defined', function () {
      expect(ctrl.downloadCsv).toBeDefined();
    });

    it('downloadCsvQuery is defined', function () {
      expect(ctrl.downloadCsvQuery).toBeDefined();
    });

    it('downloadCsvQuery returns appropriate value', function () {
      expect(ctrl.downloadCsvQuery()).toEqual(
        'filter_attribute=%7B%7D&limit=100000000&sort='
      );
    });

    it('downloadCsv sets location.href properly', function () {
      ctrl.downloadCsv();
      expect(window.location.href).toEqual(
        '/files_download?filter_attribute=%7B%7D&limit=100000000&sort='
      );
    });

    describe('refreshUserFiles', function () {
      it('called the correct service', function () {
        var mockServiceResponse = false;
        spyOn(factory, 'getUserFiles').and.callFake(function () {
          return {
            then: function () {
              mockServiceResponse = true;
            }
          };
        });
        expect(mockServiceResponse).toEqual(false);
        ctrl.refreshUserFiles();
        expect(mockServiceResponse).toEqual(true);
      });
    });
  });
})();
