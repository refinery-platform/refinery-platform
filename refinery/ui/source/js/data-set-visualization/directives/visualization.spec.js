(function () {
  'use strict';

  describe('rpDataSetVisualization component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDataSetVisualization'));

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
        $window.getStaticUrl('partials/data-set-visualization/partials/visualization.html'),
        '<div id="visualization-list"></div>'
      );

      // Mock api call due to ctrl activate method
      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApiV2 +
          '/tools/?data_set_uuid=' + window.dataSetUuid + '&tool_type=visualization'
        ).respond(200, []);

      var scope = $rootScope.$new();
      // Parent component
      var template = '<rp-data-set-visualization></rp-data-set-visualization>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('visualization-list');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
