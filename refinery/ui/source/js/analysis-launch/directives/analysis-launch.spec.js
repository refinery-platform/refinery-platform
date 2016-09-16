// Unit test for analysis launch directive
'use strict';

describe('rpAnalysisLaunch directive unit test', function () {
  beforeEach(module('refineryApp'));
  beforeEach(module('refineryAnalysisLaunch'));

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
      '/static/partials/analysis-launch/partials/analysis-launch.html',
      '<button id="rp-analysis-launch-modal"></button>'
    );
    compile = _$compile_;
    rootScope = _$rootScope_;
    scope = rootScope.$new();
    template = '<rp-analysis-launch></rp-analysis-launch>';
    directiveElement = compile(template)(scope);
    scope.$digest();
  }));

  it('generates the appropriate HTML', function () {
    expect(directiveElement.html()).toContain('rp-analysis-launch-modal');
    expect(directiveElement.html()).toContain('</button>');
  });
});
