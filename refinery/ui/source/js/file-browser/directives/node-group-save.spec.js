// Unit test for save button directive
'use strict';

describe('rpFileBrowserNodeGroupSave directive unit test', function () {
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
      '/static/partials/file-browser/partials/node-group-save.html',
      '<button class="btn btn-default btn-xs" id="save"></button>'
    );
    compile = _$compile_;
    rootScope = _$rootScope_;
    scope = rootScope.$new();
    template = '<rp-file-browser-node-group-save></rp-file-browser-node-group-save>';
    directiveElement = compile(template)(scope);
    scope.$digest();
  }));

  it('called the correct partial', function () {
    expect(directiveElement.html()).toContain('btn btn-default');
    expect(directiveElement.html()).toContain('save');
    expect(directiveElement.html()).toContain('</button>');
  });
});
