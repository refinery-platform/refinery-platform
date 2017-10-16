(function () {
  'use strict';

  describe('rpAnalysisMonitorGlobalStatusPopover component unit test', function () {
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
        $window.getStaticUrl('partials/analysis-monitor/partials/global-status-popover.html'),
        '<div id="global-status-popover"></div>'
      );

       // Mock api call due to ctrl $init method
      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApi +
          '/analysis/?format=json&limit=10&order_by=-time_start'
        ).respond(200, []);

      var scope = $rootScope.$new();
      var template = '<rp-analysis-monitor-global-status-popover>' +
        '</rp-analysis-monitor-global-status-popover>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('global-status-popover');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
