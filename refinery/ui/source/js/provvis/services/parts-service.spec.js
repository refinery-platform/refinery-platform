(function () {
  'use strict';

  describe('provvis Parts Service', function () {
    var D3;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      d3,
      provvisPartsService
    ) {
      D3 = d3;
      service = provvisPartsService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    it('main dom variables should be initialized', function () {
      expect(service.vis).toEqual(Object.create(null));
      expect(service.cell).toEqual(Object.create(null));
    });

    it('variables should be defined', function () {
      expect(service.colorHighlight).toEqual('#ed7407');
      expect(service.colorStrokes).toEqual('#136382');
      expect(service.nodeLinkTransitionTime).toEqual(1000);
      expect(service.doiAutoUpdate).toEqual(false);
      expect(service.scaleFactor).toEqual(0.75);
    });

    it('node variables should be initialized', function () {
      expect(service.lNode).toEqual(Object.create(null));
      expect(service.aNode).toEqual(Object.create(null));
      expect(service.saNode).toEqual(Object.create(null));
      expect(service.node).toEqual(Object.create(null));
      expect(service.domNodeset).toEqual([]);
      expect(service.selectedNodeSet).toEqual(D3.map());
    });

    it('link variables should be initialized', function () {
      expect(service.link).toEqual(Object.create(null));
      expect(service.aLink).toEqual(Object.create(null));
      expect(service.saLink).toEqual(Object.create(null));
      expect(service.hLink).toEqual(Object.create(null));
      expect(service.lLink).toEqual(Object.create(null));
    });

    it('analysis variables should be initialized', function () {
      expect(service.analysis).toEqual(Object.create(null));
      expect(service.subanalysis).toEqual(Object.create(null));
      expect(service.layer).toEqual(Object.create(null));
    });

    it('box variables should be initialized', function () {
      expect(service.saBBox).toEqual(Object.create(null));
      expect(service.aBBox).toEqual(Object.create(null));
      expect(service.lBBox).toEqual(Object.create(null));
    });

    it('action variables should be initialized', function () {
      expect(service.filterAction).toEqual(Object.create(null));
      expect(service.draggingActive).toEqual(false);
      expect(service.timeColorScale).toEqual(Object.create(null));
      expect(service.filterMethod).toEqual('timeline');
      expect(service.timeLineGradientScale).toEqual(Object.create(null));
      expect(service.doiDiffScale).toEqual(Object.create(null));
    });

    it('BAK variables should be initialized', function () {
      expect(service.aNodesBAK).toEqual([]);
      expect(service.saNodesBAK).toEqual([]);
      expect(service.nodesBAK).toEqual([]);
      expect(service.aLinksBAK).toEqual([]);
      expect(service.lLinksBAK).toEqual(D3.map());
      expect(service.lNodesBAK).toEqual(D3.map());
    });

    it('lastSolrResponse variable should be initialized', function () {
      expect(service.lastSolrResponse).toEqual({});
    });
  });
})();

