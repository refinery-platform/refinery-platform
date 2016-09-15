// Unit test for file display directive
'use strict';

describe('rpFileDisplay directive unit test', function () {
  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));

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
      '/static/partials/file-browser/partials/file-display.html',
      '<div id="display-select-menu"></div>'
    );
    compile = _$compile_;
    rootScope = _$rootScope_;
    scope = rootScope.$new();
    template = '<rp-file-display></rp-file-display>';
    directiveElement = compile(template)(scope);
    scope.$digest();
  }));

  it('generates the appropriate HTML', function () {
    expect(directiveElement.html()).toContain('display-select-menu');
    expect(directiveElement.html()).toContain('</div>');
  });
});
