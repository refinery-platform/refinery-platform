(function () {
  'use strict';

  describe('rpDataSetsCard directive unit test', function () {
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
        $window.getStaticUrl('partials/dashboard/partials/data-sets-card.html'),
        '<div id="data-sets-list"></div>'
      );
      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApi +
          '/data_sets/?format=json&order_by=-modification_date'
        ).respond(200, []);

      var scope = $rootScope.$new();
      var template = '<rp-data-sets-card></rp-data-sets-card>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('data-sets-list');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
