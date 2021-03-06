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
        $window.getStaticUrl('partials/dashboard/views/dashboard.html'),
        '<div id="dashboard"><rp-history-card></rp-history-card></div>'
      );

      $templateCache.put(
        $window.getStaticUrl('partials/dashboard/partials/history-card.html'),
        '<div id="events-list"></div>'
      );
      $httpBackend
        .whenGET(
          settings.appRoot +
          settings.refineryApiV2 +
          '/events/'
        ).respond(200, []);

      $httpBackend
        .whenGET(
          settings.appRoot +
          settings.refineryApiV2 +
          '/groups/'
        ).respond(200, []);

      $httpBackend
        .whenGET(
          settings.appRoot +
          settings.refineryApiV2 +
          '/data_sets/?format=json'
        ).respond(200, []);

      var scope = $rootScope.$new();
      var template = '<rp-dashboard></rp-dashboard>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('events-list');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
