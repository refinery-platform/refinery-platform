(function () {
  'use strict';

  describe('downloadFilesModal component unit test', function () {
    beforeEach(module('refineryApp'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $controller,
      $httpBackend,
      $rootScope,
      $templateCache,
      $window,
      mockParamsFactory,
      settings
    ) {
      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApiV2 + '/obtain-auth-token/'
      ).respond(200, { token: mockParamsFactory.generateUuid() });

      $templateCache.put(
        $window.getStaticUrl('partials/commons/partials/download-files-modal.html'),
        '<div id="download-files-modal"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-download-files-modal></rp-download-files-modal>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('download-files-modal');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
