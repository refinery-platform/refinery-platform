(function () {
  'use strict';

  describe('rpHistoryCard directive unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDashboard'));

    var directiveElement;
    beforeEach(inject(function (
      $compile,
      $httpBackend,
      $rootScope,
      settings,
      $templateCache,
      $window
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/dashboard/partials/history-card.html'),
        '<div id="tools-list"></div>'
      );
      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApiV2 +
          '/tools/'
        ).respond(200, []);

      var scope = $rootScope.$new();
      var template = '<rp-history-card></rp-history-card>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('tools-list');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
