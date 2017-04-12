// Unit test for file upload directive
'use strict';

describe('rFileUpload directive unit test', function () {
  beforeEach(module('refineryApp'));
  beforeEach(module('refineryDataSetImport'));

  var compile;
  var rootScope;
  var scope;
  var template;
  var directiveElement;

  beforeEach(inject(function (
    _$compile_,
    _$rootScope_,
    $templateCache,
    $window
  ) {
    $templateCache.put(
      $window.getStaticUrl('partials/data-set-import/partials/file-upload.html'),
      '<div id="file-upload-test-element"></div>'
    );
    compile = _$compile_;
    rootScope = _$rootScope_;
    scope = rootScope.$new();
    template = '<rp-file-upload></rp-file-upload>';
    directiveElement = compile(template)(scope);
    scope.$digest();
  }));

  it('generates the appropriate HTML', function () {
    expect(directiveElement.html()).toContain('file-upload-test-element');
    expect(directiveElement.html()).toContain('</div>');
  });
});
