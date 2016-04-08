'use strict';

describe('rpAssayFiles directive unit test', function () {
  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));

  var compile;
  var rootScope;
  var scope;
  var ctrl;
  var $controller;
  var template;
  var directiveElement;

  beforeEach(inject(function (
    _$compile_,
    _$rootScope_,
    _$controller_,
    $templateCache
  ) {
    $templateCache.put(
      '/static/partials/file-browser/partials/assay-filters.html',
      '<div id="attribute-filter">' +
      '<div id="Analysis-Output" class="collapse"></div>' +
      '</div>'
    );
    compile = _$compile_;
    rootScope = _$rootScope_;
    scope = rootScope.$new();
    $controller = _$controller_;
    ctrl = $controller('FileBrowserCtrl', {
      $scope: scope
    });
    template = '<rp-file-browser-assay-filters></rp-file-browser-assay-filters>';
    directiveElement = compile(template)(scope);
    angular.element(document.body).append(directiveElement);
    scope.$digest();
  }));

  it('generates the appropriate HTML', function () {
    expect(directiveElement.html()).toContain('attribute-filter');
    expect(directiveElement.html()).toContain('</div>');
  });

  it('dropAttributePanel test, add class name', function () {
    var mockEvent = $.Event('click');
    spyOn(mockEvent, 'preventDefault');
    var domElement = angular.element(document.querySelector('#Analysis-Output'));
    expect(domElement.hasClass('in')).toEqual(false);
    scope.dropAttributePanel(mockEvent, 'Analysis Output');
    expect(domElement.hasClass('in')).toEqual(true);
  });

  it('test broadcast triggers watcher', function () {
    spyOn(scope, 'generateFilterDropSelection');
    scope.$broadcast('rf/attributeFilter-ready');
    expect(scope.generateFilterDropSelection).toHaveBeenCalled();
  });
});
