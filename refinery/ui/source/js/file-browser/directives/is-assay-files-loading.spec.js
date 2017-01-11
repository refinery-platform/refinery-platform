// Unit test for file display directive
'use strict';

describe('rpIsAssayFilesLoading directive unit test', function () {
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
      '/static/partials/file-browser/partials/is-assay-files-loading.html',
      '<span><h4>Additional rows loading....</h4></span>'
    );
    compile = _$compile_;
    rootScope = _$rootScope_;
    scope = rootScope.$new();
    template = '<rp-is-assay-files-loading></rp-is-assay-files-loading>';
    directiveElement = compile(template)(scope);
    scope.$digest();
  }));

  it('generates the appropriate HTML', function () {
    expect(directiveElement.html()).toContain('h4');
    expect(directiveElement.html()).toContain('Additional rows loading');
  });
});
