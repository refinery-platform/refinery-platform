'use strict';

describe('Dashboard.directive.visWrapper: unit tests', function () {
  var directiveEl;
  var $scope;

  beforeEach(function () {
    module('refineryApp');
    module('refineryApp.templates');
    module('refineryDashboard');

    var $compile;
    var $rootScope;

    inject(function (
      $injector,
      _$compile_,
      _$rootScope_
    ) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
    });

    $scope = $rootScope.$new();

    var element = angular.element(
      '<refinery-dashboard-vis-wrapper></refinery-dashboard-vis-wrapper>'
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
