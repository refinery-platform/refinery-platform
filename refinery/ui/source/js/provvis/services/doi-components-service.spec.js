(function () {
  'use strict';

  describe('provvis Decl Doi Components', function () {
    var D3;
    var doiObj;
    var nodeObj = {
      name: 'baseNode',
      filtered: false,
      selected: false,
      highlighted: false
    };
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      d3,
      provvisDeclDoiComponents
    ) {
      D3 = d3;
      service = provvisDeclDoiComponents;
      doiObj = new service.DoiComponents(nodeObj);
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    describe('DoiComponents', function () {
      it('DoiComponents is a method', function () {
        expect(angular.isFunction(service.DoiComponents)).toBe(true);
      });

      it('DoiComponents is sets node', function () {
        expect(doiObj.node).toEqual(nodeObj);
      });

      it('Initializes correct general interest properties', function () {
        expect(doiObj.doiTime).toEqual(0);
        expect(doiObj.doiLayerDiff).toEqual(0);
        expect(doiObj.relationship).toEqual(0);
        expect(doiObj.graphMetrics.width).toEqual(-1);
        expect(doiObj.graphMetrics.height).toEqual(-1);
      });

      it('Initializes correct change property', function () {
        expect(doiObj.change.wfParams).toEqual(D3.map());
        expect(doiObj.change.files).toEqual(D3.map());
        expect(doiObj.change.topology).toEqual(D3.map());
      });

      it('Initializes correct UI properties', function () {
        expect(doiObj.doiFiltered).toEqual(0);
        expect(doiObj.doiSelected).toEqual(0);
        expect(doiObj.doiHighlighted).toEqual(0);
        expect(doiObj.neighborhoodDoiFactor).toEqual(1);
        expect(doiObj.doiMinMax).toEqual(-1);
        expect(doiObj.doiWeightedSum).toEqual(-1);
      });

      it('Added function filteredChanged', function () {
        expect(angular.isFunction(doiObj.filteredChanged)).toBe(true);
      });

      it('filteredChanged: !node filtered then doiFiltered=0.5', function () {
        doiObj.filteredChanged();
        expect(doiObj.doiFiltered).toEqual(0.5);
      });

      it('filteredChanged: node filtered then doiFiltered=1', function () {
        doiObj.node.filtered = true;
        doiObj.filteredChanged();
        expect(doiObj.doiFiltered).toEqual(1);
      });

      it('Added function highlightedChanged', function () {
        expect(angular.isFunction(doiObj.highlightedChanged)).toBe(true);
      });

      it('highlightedChanged: !node highlighted then doiHighlighted=0', function () {
        doiObj.highlightedChanged();
        expect(doiObj.doiHighlighted).toEqual(0);
      });

      it('highlightedChanged: node highlighted then doiHighlighted=1', function () {
        doiObj.node.highlighted = true;
        doiObj.highlightedChanged();
        expect(doiObj.doiHighlighted).toEqual(1);
      });

      it('Added function initTimeComponent', function () {
        expect(angular.isFunction(doiObj.initTimeComponent)).toBe(true);
      });

      it('initTimeComponent sets doiTime', function () {
        var fac = 0.5;
        doiObj.initTimeComponent(fac);
        expect(doiObj.doiTime).toEqual(fac);
      });

      it('Added function initLayerDiffComponent', function () {
        expect(angular.isFunction(doiObj.initLayerDiffComponent)).toBe(true);
      });

      it('initLayerDiffComponent sets doiLayerDiff', function () {
        var fac = 0.5;
        doiObj.initLayerDiffComponent(fac);
        expect(doiObj.doiLayerDiff).toEqual(fac);
      });

      it('Added function computeMinMax', function () {
        expect(angular.isFunction(doiObj.computeMinMax)).toBe(true);
      });

      it('computeMinMax add correct doiMinMax', function () {
        doiObj.computeMinMax();
        expect(doiObj.doiMinMax).toEqual(-1);
      });

      it('Added function computeWeightedSum', function () {
        expect(angular.isFunction(doiObj.computeWeightedSum)).toBe(true);
      });
    });
  });
})();

