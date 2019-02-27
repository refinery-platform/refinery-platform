(function () {
  'use strict';

  describe('rpDataSetChart component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryHome'));

    var directiveElement;
    var scope;

    beforeEach(inject(function (
      $compile,
      $httpBackend,
      $rootScope,
      $templateCache,
      $window,
      settings
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/home/partials/data-set-chart.html'),
        '<div id="data-set-chart"><canvas id="files-bar-chart"></canvas></div>'
      );

      // Mock api call due to ctrl activate method
      $httpBackend
        .whenGET(
          settings.appRoot +
          settings.refineryApiV2 + '/files/?filter_attribute=%7B%7D&limit=100'
        ).respond(200, []);

      scope = $rootScope.$new();
      var template = '<rp-data-set-chart></rp-data-set-chart>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('data-set-chart');
      expect(directiveElement.html()).toContain('files-bar-chart');
    });

    it('initializes a new Chart class which is an object', function () {
      // eslint-disable-next-line no-undef
      expect(scope.DSCtrl.homeChart).toEqual(jasmine.any(Chart));
    });

    it('initializes a bar chart', function () {
      expect(scope.DSCtrl.homeChart.config.type).toEqual('bar');
    });

    it('sets a hover function', function () {
      expect(angular.isFunction(scope.DSCtrl.homeChart.config.options.hover.onHover)).toBe(true);
    });

    it('sets a hover function', function () {
      var chartConfig = scope.DSCtrl.homeChart.config.options;
      expect(angular.isFunction(chartConfig.tooltips.callbacks.label)).toBe(true);
    });
  });
})();
