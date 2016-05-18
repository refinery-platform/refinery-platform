'use strict';

describe('rpAssayFiles directive unit test', function () {
  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));

  var compile;
  var rootScope;
  var scope;
  var settings;
  var $httpBackend;
  var fakeUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';

  beforeEach(inject(function (
    _$compile_,
    _$rootScope_,
    _$httpBackend_,
    _settings_,
    $templateCache
  ) {
    $templateCache.put(
      '/static/partials/file-browser/partials/assay-files.html',
      '<div id="grid1"></div>'
    );
    compile = _$compile_;
    settings = _settings_;
    rootScope = _$rootScope_;
    $httpBackend = _$httpBackend_;
    scope = rootScope.$new();
  }));

  it('generates the appropriate HTML', function () {
    var template = '<rp-file-browser-assay-files></rp-file-browser-assay-files>';

    $httpBackend.expectGET(
      settings.appRoot +
      settings.refineryApi + '/data_sets/?format=json&order_by=-modification_date'
      + '&uuid=' + fakeUuid
    ).respond(200, {});

    // Link makes an api call to update attribute filter
    $httpBackend.expectGET(
      settings.appRoot +
      settings.refineryApiV2 +
      '/assays/' + fakeUuid + '/files/?limit=100&offset=0'
    ).respond(200, {});
    var directiveElement = compile(template)(scope);

    scope.$digest();
    expect(directiveElement.html()).toContain('grid1');
    expect(directiveElement.html()).toContain('</div>');
  });
});
