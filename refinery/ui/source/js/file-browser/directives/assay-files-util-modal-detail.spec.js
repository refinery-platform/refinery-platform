'use strict';

describe('rpAssayFilesUtilModalDetail directive unit test', function () {
  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));

  var compile;
  var rootScope;
  var scope;

  beforeEach(inject(function (_$compile_, _$rootScope_, $templateCache) {
    $templateCache.put(
      '/static/partials/file-browser/partials/assay-files-util-modal-detail.html',
      '<div class="modal-header">Data Set Table Configuration </div> ' +
      '<div class="modal-body fileUtilModal"> List of assay attributes </div>'
    );
    compile = _$compile_;
    rootScope = _$rootScope_;
    scope = rootScope.$new();
  }));
  it('generates the appropriate HTML', function () {
    var template = '<rp-assay-files-util-modal-detail></rp-assay-files-util-modal-detail>';
    var directiveElement = compile(template)(scope);

    scope.$digest();
    expect(directiveElement.html()).toContain('fileUtilModal');
    expect(directiveElement.html()).toContain('modal-body');
  });
});
