(function () {
  'use strict';

  describe('rpToolList component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryHome'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $httpBackend,
      $rootScope,
      $templateCache,
      $window,
      settings
    ) {
      // Mock api call due to ctrl activate method
      $httpBackend
        .whenGET(
          settings.appRoot +
          settings.refineryApiV2 + '/tool_definitions/?data_set_uuid=').respond(200, []);

      $templateCache.put(
        $window.getStaticUrl('partials/home/partials/tool-list.html'),
        '<div id="tool-list">/div>'
      );

      var scope = $rootScope.$new();
      var template = '<rp-tool-list></rp-tool-list>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('tool-list');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
