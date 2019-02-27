(function () {
  'use strict';

  describe('rpTwitterFeed component unit test', function () {
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
        $window.getStaticUrl('partials/home/partials/twitter-feed.html'),
        '<div id="twitter-feed">/div>'
      );

      var scope = $rootScope.$new();
      var template = '<rp-twitter-feed></rp-twitter-feed>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('twitter-feed');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
