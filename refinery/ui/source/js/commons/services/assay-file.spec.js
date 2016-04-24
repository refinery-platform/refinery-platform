'use strict';

describe('Common.service.assayFile: unit tests', function () {
  var $httpBackend;
  var $rootScope;
  var fakeUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
  var service;
  var fakeResponse = {
    facet_field_counts: {
      REFINERY_WORKFLOW_OUTPUT_6_3_s: {
        'N/A': 9
      },
      REFINERY_ANALYSIS_UUID_6_3_s: {
        'N/A': 9
      },
      Author_Characteristics_6_3_s: {
        Vezza: 1,
        'Harslem/Heafner': 1,
        McConnell: 3,
        Crocker: 2,
        'Postel/Cerf': 1,
        Cotton: 1
      },
      Year_Characteristics_6_3_s: {
        1971: 9
      },
      REFINERY_SUBANALYSIS_6_3_s: {
        '-1': 9
      },
      Title_Characteristics_6_3_s: {
        'Device independent graphical display description': 1,
        'Network Graphics meeting': 1,
        'Response to RFC 86: Proposal for Network Standard Format for a Graphics Data Stream': 1,
        'Graphics Facilities at Ames Research Center': 1,
        'Network graphic attention handling': 1,
        'UCLA - Computer Science Graphics Overview': 1,
        'Pressure from the Chairman': 1,
        'Proposal for a Network Standard Format for a Data Stream to Control Graphics Display': 1,
        'Some thoughts on Network Graphics': 1
      }
    },
    attributes: [
      {
        attribute_type: 'Characteristics',
        display_name: 'Title',
        data_type: 's',
        internal_name: 'Title_Characteristics_6_3_s'
      },
      {
        attribute_type: 'Internal',
        display_name: 'Analysis Group',
        data_type: 's',
        internal_name: 'REFINERY_SUBANALYSIS_6_3_s'
      },
      {
        attribute_type: 'Internal',
        display_name: 'Output Type',
        data_type: 's',
        internal_name: 'REFINERY_WORKFLOW_OUTPUT_6_3_s'
      },
      {
        attribute_type: 'Internal',
        display_name: 'Analysis',
        data_type: 's',
        internal_name: 'REFINERY_ANALYSIS_UUID_6_3_s'
      },
      {
        attribute_type: 'Characteristics',
        display_name: 'Author',
        data_type: 's',
        internal_name: 'Author_Characteristics_6_3_s'
      },
      {
        attribute_type: 'Characteristics',
        display_name: 'Year',
        data_type: 's',
        internal_name: 'Year_Characteristics_6_3_s'
      }],
    nodes: [
      {
        REFINERY_WORKFLOW_OUTPUT_6_3_s: 'N/A',
        REFINERY_ANALYSIS_UUID_6_3_s: 'N/A',
        Author_Characteristics_6_3_s: 'Crocker',
        Year_Characteristics_6_3_s: '1971',
        REFINERY_SUBANALYSIS_6_3_s: '-1',
        Title_Characteristics_6_3_s: 'Pressure from the Chairman'
      }, {
        REFINERY_WORKFLOW_OUTPUT_6_3_s: 'N/A',
        REFINERY_ANALYSIS_UUID_6_3_s: 'N/A',
        Author_Characteristics_6_3_s: 'Vezza',
        Year_Characteristics_6_3_s: '1971',
        REFINERY_SUBANALYSIS_6_3_s: '-1',
        Title_Characteristics_6_3_s: 'Network Graphics meeting'
      }, {
        REFINERY_WORKFLOW_OUTPUT_6_3_s: 'N/A',
        REFINERY_ANALYSIS_UUID_6_3_s: 'N/A',
        Author_Characteristics_6_3_s: 'Crocker',
        Year_Characteristics_6_3_s: '1971',
        REFINERY_SUBANALYSIS_6_3_s: '-1',
        Title_Characteristics_6_3_s:
          'Proposal for a Network Standard Format for a Data Stream to ' +
          'Control Graphics Display'
      }, {
        REFINERY_WORKFLOW_OUTPUT_6_3_s: 'N/A',
        REFINERY_ANALYSIS_UUID_6_3_s: 'N/A',
        Author_Characteristics_6_3_s: 'Harslem/Heafner',
        Year_Characteristics_6_3_s: '1971',
        REFINERY_SUBANALYSIS_6_3_s: '-1',
        Title_Characteristics_6_3_s: 'Some thoughts on Network Graphics'
      }, {
        REFINERY_WORKFLOW_OUTPUT_6_3_s: 'N/A',
        REFINERY_ANALYSIS_UUID_6_3_s: 'N/A',
        Author_Characteristics_6_3_s: 'McConnell',
        Year_Characteristics_6_3_s: '1971',
        REFINERY_SUBANALYSIS_6_3_s: '-1',
        Title_Characteristics_6_3_s:
          'Response to RFC 86: Proposal for Network Standard Format for a ' +
          'Graphics Data Stream'
      }, {
        REFINERY_WORKFLOW_OUTPUT_6_3_s: 'N/A',
        REFINERY_ANALYSIS_UUID_6_3_s: 'N/A',
        Author_Characteristics_6_3_s: 'McConnell',
        Year_Characteristics_6_3_s: '1971',
        REFINERY_SUBANALYSIS_6_3_s: '-1',
        Title_Characteristics_6_3_s:
          'Graphics Facilities at Ames Research Center'
      }, {
        REFINERY_WORKFLOW_OUTPUT_6_3_s: 'N/A',
        REFINERY_ANALYSIS_UUID_6_3_s: 'N/A',
        Author_Characteristics_6_3_s: 'Postel/Cerf',
        Year_Characteristics_6_3_s: '1971',
        REFINERY_SUBANALYSIS_6_3_s: '-1',
        Title_Characteristics_6_3_s: 'UCLA - Computer Science Graphics Overview'
      }, {
        REFINERY_WORKFLOW_OUTPUT_6_3_s: 'N/A',
        REFINERY_ANALYSIS_UUID_6_3_s: 'N/A',
        Author_Characteristics_6_3_s: 'McConnell',
        Year_Characteristics_6_3_s: '1971',
        REFINERY_SUBANALYSIS_6_3_s: '-1',
        Title_Characteristics_6_3_s:
          'Device independent graphical display description'
      }, {
        REFINERY_WORKFLOW_OUTPUT_6_3_s: 'N/A',
        REFINERY_ANALYSIS_UUID_6_3_s: 'N/A',
        Author_Characteristics_6_3_s: 'Cotton',
        Year_Characteristics_6_3_s: '1971',
        REFINERY_SUBANALYSIS_6_3_s: '-1',
        Title_Characteristics_6_3_s: 'Network graphic attention handling'
      }
    ],
    meta: {
      total_count: 6
    }
  };

  beforeEach(function () {
    module('refineryApp');

    inject(function ($injector) {
      var settings = $injector.get('settings');
      $httpBackend = $injector.get('$httpBackend');
      $rootScope = $injector.get('$rootScope');
      service = $injector.get('assayFileService');

      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApiV2 +
          '/assays/' + fakeUuid + '/files/'
      ).respond(200, fakeResponse);
    });
  });

  describe('Service', function () {
    it('should be defined', function () {
      expect(service).toBeDefined();
    });

    it('should be a method', function () {
      expect(typeof service).toEqual('function');
    });

    it('should return a resolving promise', function () {
      var results;
      var promise = service.query({
        uuid: fakeUuid
      }).$promise.then(function (response) {
        results = response;
      });

      expect(typeof promise.then).toEqual('function');
      $httpBackend.flush();
      $rootScope.$digest();
      expect(results.facet_field_counts)
        .toEqual(fakeResponse.facet_field_counts);
      expect(results.nodes).toEqual(fakeResponse.nodes);
      expect(results.attributes).toEqual(fakeResponse.attributes);
    });
  });
});
