'use strict';

describe('Dashboard.directive.expansionPanel: unit tests', function () {
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
      '<refinery-expansion-panel>' +
        '<div id="test"></div>' +
      '</refinery-expansion-panel>'
    );
    directiveEl = $compile(element)($scope);

    $scope.$digest();
  });

  describe('DOM', function () {
    it('should replace custom element with template', function () {
      expect(directiveEl.hasClass('expansion-panel')).toBe(true);
    });

    it('should not replace inner elements', function () {
      expect(!!directiveEl[0].querySelector('#test')).toBe(true);
    });
  });
});
