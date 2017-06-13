(function () {
  'use strict';

  describe('File Browser Factory', function () {
    var assayAttribute;
    var factory;
    var fakeToken = 'xxxx1';
    var fakeUuid;
    var mocker;
    var rootScope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function ($window, fileBrowserFactory, mockParamsFactory) {
      factory = fileBrowserFactory;
      mocker = mockParamsFactory;
      fakeUuid = mocker.generateUuid();
      $window.csrf_token = fakeToken;
    }));

    it('factory and tools variables should exist', function () {
      expect(factory).toBeDefined();
      expect(factory.assayFiles).toEqual([]);
      expect(factory.assayAttributes).toEqual([]);
      expect(factory.assayAttributeOrder).toEqual([]);
      expect(factory.assayFilesTotalItems).toEqual({});
      expect(factory.customColumnNames).toEqual([]);
    });

    describe('getAssayFiles', function () {
      var assayFiles;

      beforeEach(inject(function (
        $q,
        $rootScope,
        assayFileService,
        nodeService
      ) {
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
          var deferred = $q.defer();
          deferred.resolve(assayFiles);
          return {
            $promise: deferred.promise
          };
        });

        spyOn(nodeService, 'query').and.callFake(function () {
          var deferred = $q.defer();
          deferred.resolve(assayFiles);
          return {
            $promise: deferred.promise
          };
        });

        rootScope = $rootScope;
      }));

      it('getAssayFiles is a method', function () {
        expect(angular.isFunction(factory.getAssayFiles)).toBe(true);
      });

      it('getAssayFiles returns a promise', function () {
        var successData;
        var response = factory.getAssayFiles({
          uuid: mocker.generateUuid()
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
        $rootScope,
        $q,
        assayAttributeService
      ) {
        rootScope = $rootScope;
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
          var deferred = $q.defer();
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
})();
