(function () {
  'use strict';

  describe('Timeline View directive unit test', function () {
    var directiveElement;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache,
      $window
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/provvis/partials/timeline-view.html'),
        '<div id=provenance-time-line></div>'
      );
      scope = $rootScope.$new();
      var template = '<rp-provvis-timeline-view></rp-provvis-timeline-view>';

      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('provenance-time-line');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
