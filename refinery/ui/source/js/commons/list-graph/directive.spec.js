describe('ListGraph.directive: unit tests', function () {
  'use strict';

  var directiveEl;
  var $scope;

  beforeEach(function () {
    module('listGraph');
    module('pubSub');
    module('refineryApp');
    module('refineryApp.templates');

    var $compile;
    var $controller;
    var $q;
    var $rootScope;
    var dataSet;
    var graph;
    var listGraphSettings;
    var pubSub;

    inject(function (
      _$compile_,
      _$controller_,
      _$q_,
      _$rootScope_,
      _dataSet_,
      _graph_,
      _listGraphSettings_,
      _pubSub_
    ) {
      $compile = _$compile_;
      $controller = _$controller_;
      $q = _$q_;
      $rootScope = _$rootScope_;
      dataSet = _dataSet_;
      graph = _graph_;
      listGraphSettings = _listGraphSettings_;
      pubSub = _pubSub_;
    });

    $scope = $rootScope.$new();

    directiveEl = $compile(
      angular.element('<list-graph graph="graph"></list-graph>')
    )($scope);

    var ListGraphCtrl = $controller('ListGraphCtrl', {
      $scope: $scope,
      $element: directiveEl,
      $rootScope: $rootScope,
      graph: graph,
      ListGraphVis: function () {},
      listGraphSettings: listGraphSettings,
      dataSet: dataSet,
      pubSub: pubSub
    }, {
      graphData: $q.defer().promise,
      valuePropertyName: undefined
    });

    $scope.$digest();
  });

  describe('DOM', function () {

    it('should replace custom element with template', function () {
      expect(directiveEl.hasClass('visWrapper')).toBe(true);
    });

  });
});
