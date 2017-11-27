(function () {
  'use strict';

  describe('rpToolSelect directive unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));

    var directiveElement;
    var mocker;
    beforeEach(inject(function (
      $compile,
      $httpBackend,
      $rootScope,
      settings,
      $templateCache,
      $window,
      mockParamsFactory
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/tool-launch/partials/tool-select.html'),
        '<div id="tool-select"></div>'
      );
      mocker = mockParamsFactory;
      window.dataSetUuid = mocker.generateUuid();
      // Mock api call due to ctrl activate method
      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApiV2 +
          '/tool_definitions/?dataSetUuid=' + window.dataSetUuid
        ).respond(200, []);

      var scope = $rootScope.$new();
      var template = '<rp-tool-select></rp-tool-select>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('tool-select');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
