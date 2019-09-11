(function () {
  'use strict';

  describe('rpHome component unit test', function () {
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
      $templateCache.put(
        $window.getStaticUrl('partials/home/views/home.html'),
        '<div id="home-main">/div>'
      );
      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApiV2 + '/site_profiles/?current_site=True'
        ).respond(200, []);

      var scope = $rootScope.$new();
      var template = '<rp-home></rp-home>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('home-main');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
