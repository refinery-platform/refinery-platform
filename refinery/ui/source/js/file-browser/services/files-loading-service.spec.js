(function () {
  'use strict';

  describe('filesLoadingService', function () {
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function (filesLoadingService) {
      service = filesLoadingService;
    }));

    it('factory and tools variables should exist', function () {
      expect(service).toBeDefined();
      expect(service.isAssayFilesLoading).toEqual(false);
    });

    describe('setIsAssayFilesLoading', function () {
      it('setIsAssayFilesLoading is a method', function () {
        expect(angular.isFunction(service.setIsAssayFilesLoading)).toBe(true);
      });

      it('setIsAssayFilesLoading updates flag only for booleans', function () {
        expect(service.isAssayFilesLoading).toEqual(false);
        service.setIsAssayFilesLoading('random');
        expect(service.isAssayFilesLoading).toEqual(false);
      });

      it('setIsAssayFilesLoading updates flag', function () {
        service.setIsAssayFilesLoading(false);
        expect(service.isAssayFilesLoading).toEqual(false);
        service.setIsAssayFilesLoading(true);
        expect(service.isAssayFilesLoading).toEqual(true);
      });
    });
  });
})();
