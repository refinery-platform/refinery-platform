'use strict';

describe('Dashboard.directive.widthFixer: unit tests', function () {
  var directiveEl;
  var $scope;
  var dashboardWidthFixerService;

  beforeEach(function () {
    module('refineryApp');
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
      dashboardWidthFixerService = $injector.get('dashboardWidthFixerService');
    });

    $scope = $rootScope.$new();

    var element = angular.element(
      '<div refinery-width-fixer style="float:left">' +
        '<div style="width:10px"></div>' +
      '</div>'
    );
    directiveEl = $compile(element)($scope);
    // We need to add the element to the DOM in order for CSS styles to
    // actually be applied. We want to do this to test whether the width fixer
    // actually works.
    angular.element(document).find('body').append(element);

    $scope.$digest();
  });

  describe('DOM', function () {
    it(
      'should set current width of the element when _fixer_ is called',
      function () {
        dashboardWidthFixerService.trigger('fixer');
        $scope.$digest();
        expect(directiveEl[0].style.width).toBe('10px');
      }
    );

    it(
      'should remove width of the element when _resetter_ is called',
      function () {
        dashboardWidthFixerService.trigger('resetter');
        $scope.$digest();
        expect(directiveEl[0].style.width).toBe('');
      }
    );
  });
});
