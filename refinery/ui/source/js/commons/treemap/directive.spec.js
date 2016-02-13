describe('Treemap.directive: unit tests', function () {
  'use strict';

  var directiveEl;
  var $scope;

  beforeEach(function () {
    module('treemap');
    module('pubSub');
    module('refineryApp');
    module('refineryApp.templates');

    var $compile;
    var $controller;
    var $rootScope;

    var $q;
    var $ = function () {
      return {
        parent: function () {}
      };
    };
    var $window;
    var _ = function () {};
    var d3;
    var HEX;
    var D3Colors;
    var treemapSettings;
    var pubSub;
    var treemapContext;
    var Webworker;
    var $timeout;

    inject(function (
      _$compile_,
      _$controller_,
      _$rootScope_,
      _$q_,
      _$window_,
      _d3_,
      _HEX_,
      _D3Colors_,
      _treemapSettings_,
      _pubSub_,
      _treemapContext_,
      _Webworker_,
      _$timeout_
    ) {
      $compile = _$compile_;
      $controller = _$controller_;
      $rootScope = _$rootScope_;

      $q = _$q_;
      $window = _$window_;
      d3 = _d3_;
      HEX = _HEX_;
      D3Colors = _D3Colors_;
      treemapSettings = _treemapSettings_;
      pubSub = _pubSub_;
      treemapContext = _treemapContext_;
      Webworker = _Webworker_;
      $timeout = _$timeout_;
    });

    $scope = $rootScope.$new();

    directiveEl = $compile(
      angular.element('<treemap></treemap>')
    )($scope);

    var ListGraphCtrl = $controller('TreemapCtrl', {
      $compile: $compile,
      $controller: $controller,
      $rootScope: $rootScope,
      $element: directiveEl,
      $q: $q,
      $: $,
      $window: $window,
      _: _,
      d3: d3,
      HEX: HEX,
      D3Colors: D3Colors,
      treemapSettings: treemapSettings,
      pubSub: pubSub,
      treemapContext: treemapContext,
      Webworker: Webworker,
      $timeout: $timeout
    }, {
      graph: $q.defer().promise
    });

    $scope.$digest();
  });

  describe('DOM', function () {

    it('should replace custom element with template', function () {
      expect(directiveEl.hasClass('visWrapper')).toBe(true);
    });

  });
});
