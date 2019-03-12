'use strict';

describe('rpDataSetAboutDetails directive unit test', function () {
  beforeEach(module('refineryApp'));
  beforeEach(module('refineryDataSetAbout'));

  var compile;
  var rootScope;
  var scope;

  beforeEach(inject(function (
    _$compile_,
    _$rootScope_,
    $templateCache,
    $httpBackend,
    $window
  ) {
    $templateCache.put(
      $window.getStaticUrl('partials/data-set-about/partials/details.html'),
      '<div class="refinery-header"> ' +
      '<span class="refinery-header-left"> ' +
      '<h3>Details</h3> </span> </div>'
    );
    compile = _$compile_;
    rootScope = _$rootScope_;
    scope = rootScope.$new();
  }));
  it('generates the appropriate HTML', function () {
    var template = '<rp-data-set-about-details></rp-data-set-about-details>';
    var directiveElement = compile(template)(scope);
    expect(directiveElement.html()).not.toContain('refinery-header-left');
    expect(directiveElement.html()).not.toContain('<h3>Details</h3>');
    scope.$digest();
    expect(directiveElement.html()).toContain('refinery-header-left');
    expect(directiveElement.html()).toContain('<h3>Details</h3>');
  });
});
