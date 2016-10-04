// Unit test for visualization spec
'use strict';

describe('rpIGVLaunchModalDetail directive unit test', function () {
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
      '/static/partials/igv/partials/modal-detail.html',
      '<div id="modal-header">igv</div>'
    );
    compile = _$compile_;
    rootScope = _$rootScope_;
    scope = rootScope.$new();
    template = '<rp-i-g-v-launch-modal-detail></rp-i-g-v-launch-modal-detail>';
    directiveElement = compile(template)(scope);
    scope.$digest();
  }));

  it('generates the appropriate HTML', function () {
    expect(directiveElement.html()).toContain('modal-header');
    expect(directiveElement.html()).toContain('igv');
  });
});
