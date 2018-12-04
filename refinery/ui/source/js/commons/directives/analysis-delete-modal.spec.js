(function () {
  'use strict';

  describe('rpAnalysisDeleteModal component unit test', function () {
    beforeEach(module('refineryApp'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $controller,
      $rootScope,
      $templateCache,
      $window
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/commons/partials/analysis-delete-modal.html'),
        '<div id="analysis-delete-modal"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-analysis-delete-modal resolve="{config:{' +
        'analysis:{name:TestAnalysis,uuid:5}}}"></rp-analysis-delete-modal>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('analysis-delete-modal');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
