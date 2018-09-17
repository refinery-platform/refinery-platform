(function () {
  'use strict';

  describe('provvis Decl Service', function () {
    var D3;
    var doiCompService;
    var doiFactorService;
    var mocker;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      d3,
      mockParamsFactory,
      provvisDeclDoiComponents,
      provvisDeclService,
      provvisDeclDoiFactors
    ) {
      D3 = d3;
      doiCompService = provvisDeclDoiComponents;
      doiFactorService = provvisDeclDoiFactors;
      mocker = mockParamsFactory;
      service = provvisDeclService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    it('wraps and returns provvis Decl Doi Components', function () {
      expect(service.DoiComponents).toBeDefined(doiCompService);
    });

    it('wraps and returns provvis Decl Doi Factors', function () {
      expect(service.DoiFactors).toBeDefined(doiFactorService);
    });

    describe('Analysis', function () {
      var id = 1;
      var parent = {};
      var hidden = false;
      var uuid;
      var wfUuid;
      var analysis = {};
      var start = 0;
      var end = 1;
      var created = true;
      var analysisObj;

      beforeEach(function () {
        uuid = mocker.generateUuid();
        wfUuid = mocker.generateUuid();
        analysisObj = new service.Analysis(id, parent, hidden, uuid,
         wfUuid, analysis, start, end, created);
      });

      it('Analysis is a method', function () {
        expect(angular.isFunction(service.Analysis)).toBe(true);
      });

      it('Analysis is a constructor function', function () {
        expect(analysisObj instanceof service.Analysis).toBe(true);
      });

      it('Sets the correct node properties', function () {
        expect(analysisObj.uuid).toEqual(uuid);
        expect(analysisObj.wfUuid).toEqual(wfUuid);
        expect(analysisObj.analysis).toEqual(analysis);
        expect(analysisObj.start).toEqual(start);
        expect(analysisObj.end).toEqual(end);
        expect(analysisObj.created).toEqual(created);
      });

      it('Initilizes the correct properties', function () {
        expect(analysisObj.inputs).toEqual(D3.map());
        expect(analysisObj.outputs).toEqual(D3.map());
        expect(analysisObj.links).toEqual(D3.map());
        expect(analysisObj.wfName).toEqual('');
        expect(analysisObj.wfCode).toEqual('');
        expect(analysisObj.layer).toEqual('');
        expect(analysisObj.motif).toEqual('');
        expect(analysisObj.exaggerated).toEqual(false);
      });

      it('Initilizes the motifDiff', function () {
        expect(analysisObj.motifDiff.numIns).toEqual(0);
        expect(analysisObj.motifDiff.numOuts).toEqual(0);
        expect(analysisObj.motifDiff.wfUuid).toEqual(wfUuid);
        expect(analysisObj.motifDiff.numSubanalyses).toEqual(0);
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
      var id = 3;
      var motif = {};
      var parent = {};
      var hidden = false;
      var layerObj;

      beforeEach(function () {
        layerObj = new service.Layer(id, motif, parent, hidden);
      });

      it('Layer is a method', function () {
        expect(angular.isFunction(service.Layer)).toBe(true);
      });

      it('Layer is a constructor function', function () {
        expect(layerObj instanceof service.Layer).toBe(true);
      });

      it('Initilizes the correct properties', function () {
        expect(layerObj.inputs).toEqual(D3.map());
        expect(layerObj.outputs).toEqual(D3.map());
        expect(layerObj.links).toEqual(D3.map());
        expect(layerObj.motif).toEqual(motif);
        expect(layerObj.wfName).toEqual('');
      });
    });

    describe('Link', function () {
      var id = 7;
      var source = {};
      var target = {};
      var hidden = false;
      var linkObj;

      beforeEach(function () {
        linkObj = new service.Link(id, source, target, hidden);
      });

      it('Link is a method', function () {
        expect(angular.isFunction(service.Link)).toBe(true);
      });

      it('Link is a constructor function', function () {
        expect(linkObj instanceof service.Link).toBe(true);
      });


      it('Initializes correct properties', function () {
        expect(linkObj.id).toEqual(id);
        expect(linkObj.source).toEqual(source);
        expect(linkObj.target).toEqual(target);
        expect(linkObj.hidden).toEqual(hidden);
      });

      it('Initilizes the correct properties', function () {
        expect(linkObj.l.ts.removed).toEqual(false);
        expect(linkObj.highlighted).toEqual(false);
        expect(linkObj.filtered).toEqual(true);
      });

      it('Tracks number of instances correctly', function () {
        expect(service.Link.numInstances).toEqual(1);
        new service.Link();
        expect(service.Link.numInstances).toEqual(2);
      });
    });

    describe('Motif', function () {
      var motifObj;

      beforeEach(function () {
        motifObj = new service.Motif();
      });

      it('Motif is a method', function () {
        expect(angular.isFunction(service.Motif)).toBe(true);
      });

      it('Motif is a constructor function', function () {
        expect(motifObj instanceof service.Motif).toBe(true);
      });

      it('Initilizes the correct properties', function () {
        expect(motifObj.preds).toEqual(D3.map());
        expect(motifObj.succs).toEqual(D3.map());
        expect(motifObj.numIns).toEqual(0);
        expect(motifObj.numIns).toEqual(0);
        expect(motifObj.wfUuid).toEqual('');
        expect(motifObj.numSubanalyses).toEqual(0);
        expect(motifObj.file).toEqual('');
      });

      it('Tracks number of instances correctly', function () {
        expect(service.Motif.numInstances).toEqual(1);
        new service.Motif();
        expect(service.Motif.numInstances).toEqual(2);
      });
    });

    describe('Node', function () {
      var id = 1;
      var nodeType = 'base';
      var parent = {};
      var hidden = false;
      var name = 'Test Node';
      var fileType = 'node';
      var study = {};
      var assay = {};
      var parents = {};
      var analysis = {};
      var subanalysis = {};
      var uuid;
      var fileUrl = '/fake-location';
      var nodeObj;

      beforeEach(function () {
        uuid = mocker.generateUuid();
        nodeObj = new service.Node(id, nodeType, parent, hidden, name, fileType,
          study, assay, parents, analysis, subanalysis, uuid, fileUrl);
      });

      it('Node is a method', function () {
        expect(angular.isFunction(service.Node)).toBe(true);
      });

      it('Node is a constructor function', function () {
        expect(nodeObj instanceof service.Node).toBe(true);
      });

      it('Sets the correct node properties', function () {
        expect(nodeObj.name).toEqual(name);
        expect(nodeObj.fileType).toEqual(fileType);
        expect(nodeObj.study).toEqual(study);
        expect(nodeObj.assay).toEqual(assay);
        expect(nodeObj.parents).toEqual(parents);
        expect(nodeObj.analysis).toEqual(analysis);
        expect(nodeObj.subanalysis).toEqual(subanalysis);
        expect(nodeObj.uuid).toEqual(uuid);
        expect(nodeObj.fileUrl).toEqual(fileUrl);
      });

      it('Initilizes the correct properties', function () {
        expect(nodeObj.label).toEqual('');
        expect(nodeObj.attributes).toEqual(D3.map());
      });
    });

    describe('ProvGraph', function () {
      var dataset = [];
      var nodes = [];
      var links = [];
      var aLinks = [];
      var iNodes = [];
      var oNodes = [];
      var aNodes = [];
      var saNodes = [];
      var analysisWorkflowMap = {};
      var nodeMap = {};
      var analysisData = [];
      var workflowData = [];
      var nodeData = [];
      var provGraphObj;

      beforeEach(function () {
        provGraphObj = new service.ProvGraph(dataset, nodes, links, aLinks,
          iNodes, oNodes, aNodes, saNodes, analysisWorkflowMap, nodeMap,
          analysisData, workflowData, nodeData);
      });

      it('ProvGraph is a method', function () {
        expect(angular.isFunction(service.ProvGraph)).toBe(true);
      });

      it('ProvGraph is a constructor function', function () {
        expect(provGraphObj instanceof service.ProvGraph).toBe(true);
      });


      it('Sets correct properties', function () {
        expect(provGraphObj.dataset).toEqual(dataset);
        expect(provGraphObj.nodes).toEqual(nodes);
        expect(provGraphObj.links).toEqual(links);
        expect(provGraphObj.aLinks).toEqual(aLinks);
        expect(provGraphObj.iNodes).toEqual(iNodes);
        expect(provGraphObj.oNodes).toEqual(oNodes);
        expect(provGraphObj.aNodes).toEqual(aNodes);
        expect(provGraphObj.saNodes).toEqual(saNodes);
        expect(provGraphObj.analysisWorkflowMap).toEqual(analysisWorkflowMap);
        expect(provGraphObj.nodeMap).toEqual(nodeMap);
        expect(provGraphObj.analysisData).toEqual(analysisData);
        expect(provGraphObj.workflowData).toEqual(workflowData);
        expect(provGraphObj.nodeData).toEqual(nodeData);
      });

      it('Initilizes the correct properties', function () {
        expect(provGraphObj.bclgNodes).toEqual([]);
        expect(provGraphObj.l.width).toEqual(0);
        expect(provGraphObj.l.depth).toEqual(0);
        expect(provGraphObj.lNodes).toEqual(D3.map());
        expect(provGraphObj.lLinks).toEqual(D3.map());
      });
    });

    describe('ProvVis', function () {
      var parentDiv = '';
      var zoom = false;
      var data = [];
      var url = '/fake-url';
      var canvas = {};
      var rect = {};
      var margin = 0;
      var width = 0;
      var height = 0;
      var radius = 0;
      var color = '#000';
      var graph = {};
      var cell = {};
      var layerMethod = 'none';
      var provVisGraph;

      beforeEach(function () {
        provVisGraph = new service.ProvVis(parentDiv, zoom, data, url, canvas,
          rect, margin, width, height, radius, color, graph, cell, layerMethod);
      });

      it('ProvVis is a method', function () {
        expect(angular.isFunction(service.ProvVis)).toBe(true);
      });

      it('ProvVis is a constructor function', function () {
        expect(provVisGraph instanceof service.ProvVis).toBe(true);
      });

      it('Sets correct properties', function () {
        expect(provVisGraph._parentDiv).toEqual(parentDiv);
        expect(provVisGraph.zoom).toEqual(zoom);
        expect(provVisGraph._data).toEqual(data);
        expect(provVisGraph._url).toEqual(url);
        expect(provVisGraph.canvas).toEqual(canvas);
        expect(provVisGraph.rect).toEqual(rect);
        expect(provVisGraph.margin).toEqual(margin);
        expect(provVisGraph.width).toEqual(width);
        expect(provVisGraph.height).toEqual(height);
        expect(provVisGraph.radius).toEqual(radius);
        expect(provVisGraph.color).toEqual(color);
        expect(provVisGraph.graph).toEqual(graph);
        expect(provVisGraph.cell).toEqual(cell);
        expect(provVisGraph.layerMethod).toEqual(layerMethod);
      });
    });

    describe('Subanalysis', function () {
      var id = 1;
      var parent = {};
      var hidden = false;
      var subanalysis = {};
      var subanalysisObj;

      beforeEach(function () {
        subanalysisObj = new service.Subanalysis(id, parent, hidden, subanalysis);
      });

      it('Subanalysis is a method', function () {
        expect(angular.isFunction(service.Subanalysis)).toBe(true);
      });

      it('Subanalysis is a constructor function', function () {
        expect(subanalysisObj instanceof service.Subanalysis).toBe(true);
      });

      it('Initilizes the correct properties', function () {
        expect(subanalysisObj.wfUuid).toEqual('');
        expect(subanalysisObj.inputs).toEqual(D3.map());
        expect(subanalysisObj.outputs).toEqual(D3.map());
        expect(subanalysisObj.links).toEqual(D3.map());
      });
    });
  });
})();

