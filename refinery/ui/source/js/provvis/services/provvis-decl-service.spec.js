(function () {
  'use strict';

  describe('provvis Decl Service', function () {
    var D3;
    var doiCompService;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      d3,
      provvisDeclDoiComponents,
      provvisDeclService
    ) {
      D3 = d3;
      doiCompService = provvisDeclDoiComponents;
      service = provvisDeclService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    describe('Analysis', function () {
      it('Analysis is a method', function () {
        expect(angular.isFunction(service.Analysis)).toBe(true);
      });
    });

    describe('BaseNode', function () {
      var id = 1;
      var nodeType = 'base';
      var parent = {};
      var hidden = false;
      var nodeObj;

      beforeEach(function () {
        nodeObj = new service.BaseNode(id, nodeType, parent, hidden);
      });

      it('BaseNode is a method', function () {
        expect(angular.isFunction(service.BaseNode)).toBe(true);
      });

      it('BaseNode is a constructor function', function () {
        expect(nodeObj instanceof service.BaseNode).toBe(true);
      });

      it('Returns the correct set properties', function () {
        expect(nodeObj.id).toEqual(id);
        expect(nodeObj.nodeType).toEqual(nodeType);
        expect(nodeObj.parent).toEqual(parent);
        expect(nodeObj.hidden).toEqual(hidden);
        expect(nodeObj.selected).toEqual(false);
        expect(nodeObj.filtered).toEqual(true);
      });

      it('Initializes correct properties', function () {
        expect(nodeObj.preds).toEqual(D3.map());
        expect(nodeObj.succs).toEqual(D3.map());
        expect(nodeObj.predLinks).toEqual(D3.map());
        expect(nodeObj.succLinks).toEqual(D3.map());
        expect(nodeObj.children).toEqual(D3.map());
        expect(nodeObj.x).toEqual(0);
        expect(nodeObj.y).toEqual(0);
      });

      it('Initializes correct layout specific properties', function () {
        expect(nodeObj.l.width).toEqual(0);
        expect(nodeObj.l.depth).toEqual(0);
        expect(nodeObj.l.bcOrder).toEqual(-1);
        expect(nodeObj.l.ts.removed).toEqual(false);
      });

      it('Initializes doiComponent', function () {
        expect(nodeObj.doi instanceof doiCompService.DoiComponents).toEqual(true);
      });

      it('Tracks number of instances correctly', function () {
        expect(service.BaseNode.numInstances).toEqual(1);
        new service.BaseNode(3, nodeType, parent, hidden);
        expect(service.BaseNode.numInstances).toEqual(2);
      });
    });

    describe('Layer', function () {
      it('Layer is a method', function () {
        expect(angular.isFunction(service.Layer)).toBe(true);
      });
    });

    describe('Link', function () {
      it('Link is a method', function () {
        expect(angular.isFunction(service.Link)).toBe(true);
      });
    });

    describe('Motif', function () {
      it('Motif is a method', function () {
        expect(angular.isFunction(service.Motif)).toBe(true);
      });
    });

    describe('Node', function () {
      it('Node is a method', function () {
        expect(angular.isFunction(service.Node)).toBe(true);
      });
    });

    describe('ProvGraph', function () {
      it('ProvGraph is a method', function () {
        expect(angular.isFunction(service.ProvGraph)).toBe(true);
      });
    });

    describe('ProvVis', function () {
      it('ProvVis is a method', function () {
        expect(angular.isFunction(service.ProvVis)).toBe(true);
      });
    });

    describe('Subanalysis', function () {
      it('Subanalysis is a method', function () {
        expect(angular.isFunction(service.Subanalysis)).toBe(true);
      });
    });
  });
})();

