(function () {
  'use strict';

  describe('rpPrimaryGroupButton component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDashboard'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $httpBackend,
      $rootScope,
      $templateCache,
      $window,
      settings
    ) {
       // Parent parent component contains the data card (child) component
      $templateCache.put(
        $window.getStaticUrl('partials/dashboard/views/dashboard.html'),
        '<div id="dashboard"><rp-data-sets-card></rp-data-sets-card></div>'
      );
      // Parent component contains the button (child) component
      $templateCache.put(
        $window.getStaticUrl('partials/dashboard/partials/data-sets-card.html'),
        '<div id="data-set-card"><rp-primary-group-button></rp-primary-group-button></div>'
      );
      $templateCache.put(
        $window.getStaticUrl('partials/dashboard/partials/primary-group-button.html'),
        '<div id="primary-group-button"></div>'
      );

      $httpBackend
        .whenGET(
          settings.appRoot +
          settings.refineryApi +
          '/extended_groups/members/?format=json&id=id'
        ).respond(200, []);

      $httpBackend
        .whenGET(
          settings.appRoot +
          settings.refineryApiV2 +
          '/data_sets/?format=json'
        ).respond(200, []);

      var scope = $rootScope.$new();
      // Parent component
      var template = '<rp-dashboard></rp-dashboard>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('primary-group-button');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
