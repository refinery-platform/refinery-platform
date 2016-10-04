// Unit test for visualization spec
'use strict';

describe('rpVisualization directive unit test', function () {
  beforeEach(module('refineryApp'));
  beforeEach(module('refineryVisualization'));

  var compile;
  var rootScope;
  var scope;
  var template;
  var directiveElement;

  beforeEach(inject(function (
    _$compile_,
    _$rootScope_,
    $templateCache
  ) {
    $templateCache.put(
      '/static/partials/visualization/partials/visualization.html',
      '<div id="visualization-select-menu"></div>'
    );
    compile = _$compile_;
    rootScope = _$rootScope_;
    scope = rootScope.$new();
    template = '<rp-visualization></rp-visualization>';
    directiveElement = compile(template)(scope);
    scope.$digest();
  }));

  it('generates the appropriate HTML', function () {
    expect(directiveElement.html()).toContain('visualization-select-menu');
    expect(directiveElement.html()).toContain('</div>');
  });
});
