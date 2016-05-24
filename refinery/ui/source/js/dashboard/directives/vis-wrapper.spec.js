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
    var $httpBackend;
    var settings;

    inject(function (
      $injector,
      _$compile_,
      _$httpBackend_,
      _$rootScope_
    ) {
      $compile = _$compile_;
      $httpBackend = _$httpBackend_;
      $rootScope = _$rootScope_;

      settings = $injector.get('settings');
    });

    $scope = $rootScope.$new();

    var element = angular.element(
      '<refinery-dashboard-vis-wrapper></refinery-dashboard-vis-wrapper>'
    );
    directiveEl = $compile(element)($scope);

    $httpBackend
      .expectGET(
        settings.appRoot +
        settings.refineryApi +
        '/data_sets/ids/?format=json&order_by=-modification_date'
      )
      .respond(200);

    $httpBackend
      .expectGET(
        settings.appRoot +
        settings.neo4jApi +
        '/annotations/'
      )
      .respond(200);

    $httpBackend
      .expectGET(
        settings.appRoot +
        settings.refineryApi +
        '/data_sets/annotations/'
      )
      .respond(200);

    $scope.$digest();
    $httpBackend.flush();
  });

  describe('DOM', function () {
    it('should replace custom element with template', function () {
      expect(directiveEl.hasClass('content-container')).toBe(true);
    });
  });
});
