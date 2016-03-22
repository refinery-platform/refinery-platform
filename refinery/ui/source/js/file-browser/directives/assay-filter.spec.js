describe('rpAssayFiles directive unit test', function() {

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));

  var compile,
      rootScope,
      scope,
      ctrl,
      settings,
      $controller,
      valid_uuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';

  beforeEach(inject(function(_$compile_, _$rootScope_, _$controller_,
                             _$httpBackend_, _settings_,  $templateCache) {

    $templateCache.put(
      '/static/partials/file-browser/partials/assay-files.html',
      '<div id="grid1"></div>'
    );
    compile = _$compile_;
    settings = _settings_;
    rootScope = _$rootScope_;
    $httpBackend = _$httpBackend_;
    scope = rootScope.$new();
    $controller = _$controller_;
    ctrl = $controller('FileBrowserCtrl', {$scope: scope});

  }));

  it('generates the appropriate HTML', function() {
    var template = '<rp-file-browser-assay-files></rp-file-browser-assay-files>';
    //Link makes an api call to update attribute filter
    $httpBackend.expectGET(
      settings.appRoot +
      settings.refineryApiV2 +
      '/assays/' + valid_uuid + '/files/'
    ).respond(200, {});
    var directiveElement = compile(template)(scope);

    scope.$digest();
    expect(directiveElement.html()).toContain('grid1');
    expect(directiveElement.html()).toContain('</div>');
  });
});
