'use strict';

describe('rpDataSetAboutSharing directive unit test', function () {
  beforeEach(module('refineryApp'));
  beforeEach(module('refineryDataSetAbout'));

  var compile;
  var rootScope;
  var scope;
  var fakeUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';

  beforeEach(inject(function (
    _$compile_,
    _$rootScope_,
    $templateCache,
    $httpBackend,
    $window,
    settings
  ) {
    $httpBackend
      .expectGET(
        settings.appRoot +
        settings.refineryApi +
        '/data_sets/' + fakeUuid + '/sharing/?format=json'
     ).respond(200, '');

    $templateCache.put(
      $window.getStaticUrl('partials/data-set-about/partials/sharing.html'),
      '<div class="refinery-header"> ' +
      '<span class="refinery-header-left"> ' +
      '<h3>Sharing</h3> </span> </div>'
    );
    compile = _$compile_;
    rootScope = _$rootScope_;
    scope = rootScope.$new();
  }));
  it('generates the appropriate HTML', function () {
    var template = '<rp-data-set-about-sharing></rp-data-set-about-sharing>';
    var directiveElement = compile(template)(scope);
    expect(directiveElement.html()).not.toContain('refinery-header-left');
    expect(directiveElement.html()).not.toContain('<h3>Sharing</h3>');
    scope.$digest();
    expect(directiveElement.html()).toContain('refinery-header-left');
    expect(directiveElement.html()).toContain('<h3>Sharing</h3>');
  });
});
