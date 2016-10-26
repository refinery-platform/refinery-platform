'use strict';

describe('File Browser Factory', function () {
  var factory;
  var deferred;
  var rootScope;
  var $q;
  var assayAttribute;
  var fakeUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
  var fakeToken = 'xxxx1';

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));
  beforeEach(inject(function (_fileBrowserFactory_, $window) {
    factory = _fileBrowserFactory_;
    $window.csrf_token = fakeToken;
  }));

  it('factory and tools variables should exist', function () {
    expect(factory).toBeDefined();
    expect(factory.assayFiles).toEqual([]);
    expect(factory.assayAttributes).toEqual([]);
    expect(factory.assayAttributeOrder).toEqual([]);
    expect(factory.attributeFilter).toEqual({});
    expect(factory.analysisFilter).toEqual({});
    expect(factory.assayFilesTotalItems).toEqual({});
    expect(factory.nodeGroupList).toEqual([]);
    expect(factory.customColumnNames).toEqual([]);
    expect(factory.filesParam).toBeDefined();
  });

  describe('getAssayFiles', function () {
    var assayFiles;

    beforeEach(inject(function (
      assayFileService,
      nodeService,
      _$q_,
      _$rootScope_
    ) {
      $q = _$q_;
      assayFiles = {
        nodes: [
          {
            REFINERY_ANALYSIS_UUID_6_3_s: 'N/A',
            Author_Characteristics_6_3_s: 'McConnell',
            REFINERY_WORKFLOW_OUTPUT_6_3_s: 'N/A'
          },
          {
            REFINERY_ANALYSIS_UUID_6_3_s: 'fbc78aaa-1050-403b-858c-a1504a40ef54',
            Author_Characteristics_6_3_s: 'McConnell',
            REFINERY_WORKFLOW_OUTPUT_6_3_s: '1_test_01'
          },
          {
            REFINERY_ANALYSIS_UUID_6_3_s: '547ac4a0-7d5a-48a9-8859-8620ad94c7a2',
            Author_Characteristics_6_3_s: 'McConnell',
            REFINERY_WORKFLOW_OUTPUT_6_3_s: '1_test tool out'
          }],
        attributes: [{
          attribute_type: 'Internal',
          file_ext: 's',
          display_name: 'Output Type',
          internal_name: 'REFINERY_WORKFLOW_OUTPUT_6_3_s'
        }, {
          attribute_type: 'Internal',
          file_ext: 's',
          display_name: 'Analysis',
          internal_name: 'REFINERY_ANALYSIS_UUID_6_3_s'
        }, {
          attribute_type: 'Characteristics',
          file_ext: 's',
          display_name: 'Author',
          internal_name: 'Author_Characteristics_6_3_s'
        }],
        facet_field_counts: {
          REFINERY_WORKFLOW_OUTPUT_6_3_s: {
            '1_test_04': 2,
            '1_test_02': 2
          },
          REFINERY_ANALYSIS_UUID_6_3_s: {
            '5d2311d1-6d8c-4857-bc57-2f25563aee91': 4
          },
          Author_Characteristics_6_3_s: {
            Vezza: 1,
            'Harslem/Heafner': 1,
            McConnell: 6,
            'Crocker + McConnell': 4,
            Crocker: 4,
            'Postel/Cerf': 1,
            Cotton: 1
          }
        }
      };
      spyOn(assayFileService, 'query').and.callFake(function () {
        deferred = $q.defer();
        deferred.resolve(assayFiles);
        return {
          $promise: deferred.promise
        };
      });

      spyOn(nodeService, 'query').and.callFake(function () {
        deferred = $q.defer();
        deferred.resolve(assayFiles);
        return {
          $promise: deferred.promise
        };
      });

      rootScope = _$rootScope_;
    }));

    it('getAssayFiles is a method', function () {
      expect(angular.isFunction(factory.getAssayFiles)).toBe(true);
    });

    it('getAssayFiles returns a promise', function () {
      var successData;
      var response = factory.getAssayFiles({
        uuid: fakeUuid
      }).then(function (responseData) {
        successData = responseData;
      });
      rootScope.$apply();
      expect(typeof response.then).toEqual('function');
      expect(successData).toEqual(assayFiles);
    });
  });

  describe('getAssayAttributeOrder', function () {
    beforeEach(inject(function (
      _$rootScope_,
      _$q_,
      assayAttributeService
    ) {
      rootScope = _$rootScope_;
      $q = _$q_;
      assayAttribute = [
        {
          assay: 3,
          study: 6,
          solr_field: 'REFINERY_SUBANALYSIS_6_3_s',
          rank: 5,
          is_exposed: true,
          is_facet: true,
          is_active: true,
          is_internal: false,
          id: 41,
          display_name: 'Analysis Group'
        }
      ];
      spyOn(assayAttributeService, 'query').and.callFake(function () {
        deferred = $q.defer();
        deferred.resolve(assayAttribute);
        return {
          $promise: deferred.promise
        };
      });
    }));

    it('getAssayAttributeOrder is a method', function () {
      expect(angular.isFunction(factory.getAssayAttributeOrder)).toBe(true);
    });

    it('getAssayAttributeOrder makes assay attribute service call', function () {
      var data;

      var _response = factory.getAssayAttributeOrder(fakeUuid)
        .then(function (response) {
          data = response;
        }, function () {
          data = 'ERROR';
        });
      rootScope.$apply();
      expect(typeof _response.then).toEqual('function');
      expect(data.solr_field).toEqual(assayAttribute.solr_field);
    });
  });

  describe('getNodeGroupList', function () {
    var nodeGroupList;

    beforeEach(inject(function (
      nodeGroupService,
      _$q_,
      _$rootScope_
    ) {
      $q = _$q_;
      nodeGroupList = [
        {
          uuid: '7f9fdd26-187f-45d1-a87e-4d4e02d5aa1d',
          node_count: 0,
          is_implicit: false,
          study: '8486046b-22f4-447f-9c81-41dbf6173c44',
          assay: '2a3c4155-db7b-4138-afcb-67ad1cc04d51',
          is_current: false,
          nodes: [],
          name: 'Node Group 1'
        },
        {
          uuid: '7ac6196a-a710-4a51-9744-3466751366d8',
          node_count: 0,
          is_implicit: false,
          study: '8486046b-22f4-447f-9c81-41dbf6173c44',
          assay: '2a3c4155-db7b-4138-afcb-67ad1cc04d51',
          is_current: false,
          nodes: [],
          name: 'Node Group 2'
        }
      ];

      spyOn(nodeGroupService, 'query').and.callFake(function () {
        deferred = $q.defer();
        deferred.resolve(nodeGroupList);
        return {
          $promise: deferred.promise
        };
      });
      rootScope = _$rootScope_;
    }));

    it('getNodeGroupList is a method', function () {
      expect(angular.isFunction(factory.getNodeGroupList)).toBe(true);
    });

    it('getNodeGroupList returns a promise', function () {
      var successData;
      var response = factory.getNodeGroupList({
        uuid: fakeUuid
      }).then(function (responseData) {
        successData = responseData;
      });
      rootScope.$apply();
      expect(typeof response.then).toEqual('function');
      expect(successData).toEqual(nodeGroupList);
    });
  });

  describe('createNodeGroup', function () {
    var nodeGroup;

    beforeEach(inject(function (
      nodeGroupService,
      _$q_,
      _$rootScope_
    ) {
      $q = _$q_;
      nodeGroup = {
        uuid: '7f9fdd26-187f-45d1-a87e-4d4e02d5aa1d',
        node_count: 0,
        is_implicit: false,
        study: '8486046b-22f4-447f-9c81-41dbf6173c44',
        assay: '2a3c4155-db7b-4138-afcb-67ad1cc04d51',
        is_current: false,
        nodes: [],
        name: 'Node Group 1'
      };

      spyOn(nodeGroupService, 'save').and.callFake(function () {
        deferred = $q.defer();
        deferred.resolve(nodeGroup);
        return {
          $promise: deferred.promise
        };
      });
      rootScope = _$rootScope_;
    }));

    it('createNodeGroup is a method', function () {
      expect(angular.isFunction(factory.createNodeGroup)).toBe(true);
    });

    it('createNodeGroup returns a promise', function () {
      var successData;
      var response = factory.createNodeGroup({
        uuid: fakeUuid
      }).then(function (responseData) {
        successData = responseData;
      });
      rootScope.$apply();
      expect(typeof response.then).toEqual('function');
      expect(successData).toEqual(nodeGroup);
    });
  });

  describe('createColumnDefs', function () {
    var tempAssayAttributes = [
      { display_name: 'Attribute1',
        internal_name: '_Attribute1_s'
      },
      { display_name: 'Analysis Group',
        internal_name: 'Analysis Group'
      },
      { display_name: 'Url',
        internal_name: 'Url'
      }
    ];

    it('createColumnDefs is a method', function () {
      expect(angular.isFunction(factory.createColumnDefs)).toBe(true);
    });

    it('returns an array of same length', function () {
      angular.copy(tempAssayAttributes, factory.assayAttributes);
      var response = factory.createColumnDefs();
      expect(response.length).toEqual(tempAssayAttributes.length);
    });

    it('returns corrent template for analysis group', function () {
      var analysisGroupTemplate = '<div class="ngCellText text-align-center"' +
        'ng-class="col.colIndex()">{{COL_FIELD |' +
          ' analysisGroupNegativeOneWithNA: "Analysis Group"}}</div>';
      angular.copy(tempAssayAttributes, factory.assayAttributes);
      var response = factory.createColumnDefs();
      expect(response[1].cellTemplate).toContain(analysisGroupTemplate);
    });
  });

  describe('trimAssayFiles', function () {
    var tempAssayFiles = [
      { name: 'Test1' },
      { name: 'Test2' },
      { name: 'Test3' },
      { name: 'Test4' },
      { name: 'Test5' },
      { name: 'Test6' }
    ];

    it('trimAssayFiles is a method', function () {
      expect(angular.isFunction(factory.trimAssayFiles)).toBe(true);
    });

    it('should slice assayFiles', function () {
      angular.copy(tempAssayFiles, factory.assayFiles);
      factory.trimAssayFiles(5, 0);
      expect(factory.assayFiles[0].name).toEqual('Test1');
      expect(factory.assayFiles.length).toEqual(5);
    });

    it('should trim assayFiles', function () {
      angular.copy(tempAssayFiles, factory.assayFiles);
      factory.trimAssayFiles(5);
      expect(factory.assayFiles[0].name).toEqual('Test6');
      expect(factory.assayFiles.length).toEqual(1);
    });

    it('should not trim assayFiles', function () {
      angular.copy(tempAssayFiles, factory.assayFiles);
      factory.trimAssayFiles(0);
      expect(factory.assayFiles.length).toEqual(6);
    });

    it('should empty assayFiles', function () {
      angular.copy(tempAssayFiles, factory.assayFiles);
      factory.trimAssayFiles(0, 0);
      expect(factory.assayFiles.length).toEqual(0);
    });
  });
});
