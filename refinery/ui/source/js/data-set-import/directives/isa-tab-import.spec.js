'use strict';

describe('DataSetImport.directive.isaTabImport: unit tests', function () {
  var directiveEl;
  var $scope;

  beforeEach(function () {
    module('refineryApp');
    module('refineryApp.templates');
    module('refineryDataSetImport');

    var $compile;
    var $rootScope;

    inject(function (
      _$compile_,
      _$rootScope_
    ) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
    });

    $scope = $rootScope.$new();

    directiveEl = $compile(
      angular.element(
        '<isa-tab-import import-option="import.option"></isa-tab-import>'
      )
    )($scope);

    $scope.$digest();
  });

  describe('DOM', function () {
    it('should replace custom element with template', function () {
      expect(directiveEl.attr('id')).toBe('isa-tab-import-form');
    });
  });
});
