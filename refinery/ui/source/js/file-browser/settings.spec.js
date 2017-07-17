(function () {
  'use strict';

  describe('refineryFileBrowser.settings: unit tests', function () {
    var settings;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));

    beforeEach(inject(function (fileBrowserSettings) {
      settings = fileBrowserSettings;
    }));

    describe('settings', function () {
      it('should be registered', function () {
        expect(settings).toBeDefined();
      });

      it('should have maxFileCount constant', function () {
        expect(settings.maxFileRequest).toEqual(100);
      });
    });
  });
})();
