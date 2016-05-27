'use strict';

describe('DataSetImport.directive.metadataTable: unit tests', function () {
  var directiveEl;
  var $scope;

  beforeEach(function () {
    module('refineryApp');
    module('refineryApp.templates');
    module('refineryDataSetImport');

    var $compile;
    // var $controller;
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
        '<metadata-table import-option="import.option"></metadata-table>'
      )
    )($scope);

    $scope.$digest();
  });

  describe('DOM', function () {
    it('should replace custom element with template', function () {
      expect(directiveEl.attr('id')).toBe('metadata-table-form');
    });
  });
});
