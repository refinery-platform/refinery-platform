'use strict';

describe('Dashboard.directive.dataSetPreview: unit tests', function () {
  var directiveEl;
  var $scope;

  beforeEach(function () {
    module('refineryApp');
    module('refineryApp.templates');
    module('refineryDashboard');

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

    var element = angular.element(
      '<refinery-data-set-preview>' +
        '<div id="test"></div>' +
      '</refinery-data-set-preview>'
    );
    directiveEl = $compile(element)($scope);

    $scope.$digest();
  });

  describe('DOM', function () {
    it('should replace custom element with template', function () {
      expect(directiveEl.hasClass('content-container')).toBe(true);
    });
  });
});
