(function () {
  'use strict';

  describe('Controller: UserFileBrowserFilesCtrl', function () {
    var ctrl;
    var location;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryUserFileBrowser'));
    beforeEach(inject(function (
      $controller,
      $location,
      $rootScope
    ) {
      scope = $rootScope.$new();
      location = $location;
      location.href = '';

      ctrl = $controller('UserFileBrowserFilesCtrl', {
        $scope: scope,
        $location: location
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
      expect(location.href).toEqual(
        '/files_download?filter_attribute=%7B%7D&limit=100000000&sort='
      );
    });
  });
})();
