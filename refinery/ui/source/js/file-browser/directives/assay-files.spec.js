(function () {
  'use strict';

  describe('rpAssayFiles directive unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));

    var compile;
    var fakeUuid;
    var httpBackend;
    var mocker;
    var scope;
    var setting;

    beforeEach(inject(function (
      $compile,
      $httpBackend,
      $rootScope,
      $templateCache,
      $window,
      mockParamsFactory,
      settings
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/file-browser/partials/assay-files.html'),
        '<div id="grid1"></div>'
      );
      compile = $compile;
      setting = settings;
      mocker = mockParamsFactory;
      fakeUuid = mocker.generateUuid();
      httpBackend = $httpBackend;
      scope = $rootScope.$new();
    }));

    it('generates the appropriate HTML', function () {
      var template = '<rp-file-browser-assay-files></rp-file-browser-assay-files>';

      httpBackend.expectGET(
        setting.appRoot +
        setting.refineryApi + '/data_sets/?format=json&order_by=-modification_date'
        + '&uuid=' + fakeUuid
      ).respond(200, {});

      // Link makes an api call to update attribute filter
      httpBackend.expectGET(
        setting.appRoot +
        setting.refineryApiV2 +
        '/assays/' + fakeUuid + '/files/?limit=100&offset=0'
      ).respond(200, {});
      var directiveElement = compile(template)(scope);

      scope.$digest();
      expect(directiveElement.html()).toContain('grid1');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
