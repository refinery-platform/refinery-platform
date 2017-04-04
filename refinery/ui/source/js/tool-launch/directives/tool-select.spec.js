(function () {
  'use strict';

  describe('rpToolSelect directive unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $httpBackend,
      $rootScope,
      settings,
      $templateCache
    ) {
      $templateCache.put(
        '/static/partials/tool-launch/partials/tool-select.html',
        '<div id="tool-select"></div>'
      );

      // Mock api call due to ctrl activate method
      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApiV2 +
          '/tools/definitions'
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
