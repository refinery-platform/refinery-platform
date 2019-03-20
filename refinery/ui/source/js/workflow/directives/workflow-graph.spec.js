(function () {
  'use strict';

  describe('rpWorkflowGraph component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryWorkflow'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache,
      $window
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/workflow/partials/workflow-graph.html'),
        '<div id="workflow-graph"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-workflow-graph></rp-workflow-graph>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('workflow-graph');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
