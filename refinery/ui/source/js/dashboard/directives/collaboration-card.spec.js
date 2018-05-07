(function () {
  'use strict';

  describe('rpCollaborationCard directive unit test', function () {
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
        '<div id="dashboard"><rp-collaboration-card></rp-collaboration-card></div>'
      );

      $templateCache.put(
        $window.getStaticUrl('partials/dashboard/partials/collaboration-card.html'),
        '<div id="groups-list"></div>'
      );

      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApi +
          '/extended_groups/members/?format=json&id=id'
        ).respond(200, []);

      var scope = $rootScope.$new();
      var template = '<rp-dashboard></rp-dashboard>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('groups-list');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
