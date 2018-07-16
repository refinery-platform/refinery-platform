(function () {
  'use strict';

  describe('rpFileUploadS3 component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDataSetImport'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $componentController,
      $httpBackend,
      $rootScope,
      $templateCache,
      $window,
      settings
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/data-set-import/partials/file-upload-s3.html'),
        '<div id="file-upload-s3"></div>'
      );

      $httpBackend
        .whenPOST(
          settings.appRoot +
          settings.refineryApiV2 +
          '/openid_token/?format=json'
        ).respond(200, []);

      var scope = $rootScope.$new();
      var template = '<rp-file-upload-s3></rp-file-upload-s3>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('file-upload-s3');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
