// Unit test for assay filter
'use strict';

describe('rpNodeGroup directive unit test', function () {
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
    $templateCache,
    $httpBackend,
    settings,
    $window
  ) {
    $window.externalAssayUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
    $httpBackend
      .expectGET(
        settings.appRoot +
        settings.refineryApiV2 +
        '/node_groups/?assay=' + $window.externalAssayUuid).respond(200, '');

    $templateCache.put(
      '/static/partials/file-browser/partials/node-group.html',
      '<div id="node-group-select-menu"></div>'
    );
    compile = _$compile_;
    rootScope = _$rootScope_;
    scope = rootScope.$new();
    template = '<rp-file-browser-node-group></rp-file-browser-node-group>';
    directiveElement = compile(template)(scope);
    scope.$digest();
  }));

  it('generates the appropriate HTML', function () {
    expect(directiveElement.html()).toContain('node-group-select-menu');
    expect(directiveElement.html()).toContain('</div>');
  });
});
