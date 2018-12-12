(function () {
  'use strict';

  describe('rpVideoCarousel component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryHome'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache,
      $window
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/home/partials/video-carousel.html'),
        '<div id="home-video-carousel">/div>'
      );

      var scope = $rootScope.$new();
      var template = '<rp-video-carousel></rp-video-carousel>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('home-video-carousel');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
