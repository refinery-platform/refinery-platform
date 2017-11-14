(function () {
  'use strict';

  describe('Tools Params Service', function () {
    var mocker;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (mockParamsFactory, provvisInitService) {
      mocker = mockParamsFactory;
      service = provvisInitService;
    }));

    it('service should exist', function () {
      expect(service).toBeDefined();
    });


    it('setSelectedTool is a method', function () {
      expect(angular.isFunction(service.initGraph)).toBe(true);
    });

    it('initGraph returns an obj', function () {
      var node = {
        analysis_uuid: mocker.generateUuid(),
        assay: '',
        attributes: [],
        file_import_status: 'PENDING',
        file_url: '',
        file_uuid: mocker.generateUuid(),
        name: 'Output file',
        parents: [],
        resource_uri: '',
        study: '',
        subanalysis: 0,
        type: 'Derived Data File',
        uuid: mocker.generateUuid()
      };
      var fakeData = {
        meta: { limit: 0, offset: 0, total_count: 1 },
        objects: [node]
      };
      var fakeAnalysesData = [];
      var fakeSolrResponse = {
        nodes: [node],
        attributes: [],
        nodes_count: 1,
        facet_fields_counts: {} };
      expect(service.initGraph(fakeData, fakeAnalysesData, fakeSolrResponse))
        .toEqual(jasmine.any(Object));
    });
  });
})();
