'use strict';

describe('Treemap.directive: unit tests', function () {
  var directiveEl;
  var $scope;

  beforeEach(function () {
    module('treemap');
    module('pubSub');
    module('refineryApp');
    module('refineryApp.templates');

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
      angular.element('<treemap></treemap>')
    )($scope);

    $scope.$digest();
  });

  describe('DOM', function () {
    it('should replace custom element with template', function () {
      expect(directiveEl.hasClass('vis-wrapper')).toBe(true);
    });
  });
});
