(function () {
  'use strict';

  describe('rpAnalysisMonitorGlobalListStatus component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryAnalysisMonitor'));

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
        $window.getStaticUrl('partials/analysis-monitor/partials/global-list-status.html'),
        '<div id="global-list-status"></div>'
      );

      // Mock api call due to ctrl $init method
      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApi +
          '/analysis/?format=json&limit=0&order_by=-time_start&status__in=RUNNING,UNKNOWN'
        ).respond(200, []);

      var scope = $rootScope.$new();
      var template = '<rp-analysis-monitor-global-list-status>' +
        '</rp-analysis-monitor-global-list-status>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('global-list-status');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
