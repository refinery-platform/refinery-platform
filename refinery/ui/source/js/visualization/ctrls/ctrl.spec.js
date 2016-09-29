'use strict';

describe('Controller: VisualizationCtrl', function () {
  var ctrl;
  var scope;
  var $controller;
  var service;
  var $uibModal = { open: function () {} };
  var $templateCache;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryVisualization'));
  beforeEach(inject(function (
    $rootScope,
    _$controller_,
    _$templateCache_,
    _IGVFactory_,
    _selectedNodesService_
  ) {
    scope = $rootScope.$new();
    $controller = _$controller_;
    ctrl = $controller('VisualizationCtrl', {
      $scope: scope,
      $uibModal: $uibModal
    });
    $templateCache = _$templateCache_;
    service = _selectedNodesService_;
  }));

  it('VisualizationCtrl ctrl should exist', function () {
    expect(ctrl).toBeDefined();
  });

  it('Data & UI displays variables should exist for views', function () {
    expect(ctrl.visualizations[0]).toEqual({ name: 'IGV', template: 'i-g-v-launch-modal.html' });
    expect(ctrl.selectedVisualization).toEqual({ select: null });
  });

  describe('Test launchVisualization', function () {
    it('launchVisualization is method', function () {
      expect(angular.isFunction(ctrl.launchVisualization)).toBe(true);
    });

    it('launchVisualization to cache template', function () {
      ctrl.selectedVisualization.select = ctrl.visualizations[0];
      spyOn($templateCache, 'get');
      ctrl.launchVisualization();
      expect($templateCache.get).toHaveBeenCalled();
    });

    it('launchVisualization to open modal', function () {
      ctrl.selectedVisualization.select = ctrl.visualizations[0];
      spyOn($uibModal, 'open');
      ctrl.launchVisualization();
      expect($uibModal.open).toHaveBeenCalled();
    });
  });

  describe('areNodesSelected', function () {
    it('areNodesSelected is method', function () {
      expect(angular.isFunction(ctrl.areNodesSelected)).toBe(true);
    });

    it('areSelectedNodesEmpty calls on service variable', function () {
      expect(ctrl.areNodesSelected()).toEqual(false);
      service.selectedNodesUuids = ['x508x83x-x9xx-4740-x9x7-x7x0x631280x'];
      expect(ctrl.areNodesSelected()).toEqual(true);
    });
  });
});
