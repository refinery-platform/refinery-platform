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
        {
          display_name: 'Attribute1',
          internal_name: '_Attribute1_s',
          attribute_type: 'Factor'
        },
        {
          display_name: 'Analysis Group',
          internal_name: 'Analysis Group',
          attribute_type: 'Internal'
        },
        {
          display_name: 'Download',
          internal_name: 'Url',
          attribute_type: 'Internal'
        },
        {
          display_name: 'Selection',
          internal_name: 'Selection',
          attribute_type: 'Internal'
        },
        {
          display_name: 'Input Groups',
          internal_name: 'Input Groups',
          attribute_type: 'Internal'
        }
      ];
      var response = [];

      beforeEach(inject(function () {
        angular.copy(tempAssayAttributes, factory.assayAttributes);
        response = factory.createColumnDefs();
      }));

      it('createColumnDefs is a method', function () {
        expect(angular.isFunction(factory.createColumnDefs)).toBe(true);
      });

      it('returns an array of same length', function () {
        expect(response.length).toEqual(tempAssayAttributes.length);
      });

      it('sets cellClass to a function', function () {
        expect(angular.isFunction(response[0].cellClass)).toBe(true);
      });

      it('sets headerCellClass to a function', function () {
        expect(angular.isFunction(response[0].headerCellClass)).toBe(true);
      });

      it('sets correct name', function () {
        expect(response[0].name).toEqual(tempAssayAttributes[0].display_name);
        expect(response[1].name).toEqual(tempAssayAttributes[1].display_name);
      });

      it('sets correct field', function () {
        expect(response[0].field).toEqual(tempAssayAttributes[0].internal_name);
        expect(response[1].field).toEqual(tempAssayAttributes[1].internal_name);
      });

      it('sets other default properities for reg column', function () {
        expect(response[0].cellTooltip).toEqual(true);
        expect(response[0].enableHiding).toEqual(false);
      });

      it('returns corrent template for analysis group', function () {
        var analysisGroupTemplate = '<div class="ngCellText ui-grid-cell-contents"' +
          'ng-class="col.colIndex()">{{COL_FIELD |' +
          ' analysisGroupNegativeOneWithNA: "Analysis Group"}}</div>';
        expect(response[1].cellTemplate).toContain(analysisGroupTemplate);
      });

      // url (download) column
      it('sets url cell template', function () {
        var cellTemplate = '<rp-data-file-dropdown file-status="COL_FIELD" node-obj="row.entity">' +
          '</rp-data-file-dropdown>';
        expect(response[2].cellTemplate).toEqual(cellTemplate);
      });

      it('sets cellClass to a function for url column', function () {
        expect(angular.isFunction(response[2].cellClass)).toBe(true);
      });

      it('sets headerCellClass to a function for url column', function () {
        expect(angular.isFunction(response[2].headerCellClass)).toBe(true);
      });

      it('sets custom url field', function () {
        expect(response[2].field).toEqual(tempAssayAttributes[2].internal_name);
      });

      it('sets custom url name', function () {
        expect(response[2].name).toEqual(tempAssayAttributes[2].internal_name);
      });

      it('sets custom url display name', function () {
        expect(response[2].displayName).toEqual('File');
      });

      it('sets other default properities for url column', function () {
        expect(response[2].cellTooltip).toEqual(true);
        expect(response[2].width).toEqual(80);
        expect(response[2].enableFiltering).toEqual(false);
        expect(response[2].enableSorting).toEqual(false);
        expect(response[2].enableColumnMenu).toEqual(false);
        expect(response[2].enableColumnResizing).toEqual(true);
        expect(response[2].cellEditableCondition).toEqual(false);
      });

      // selection column
      it('returns corrent template for selection column', function () {
        var cellTemplate = '<div class="ngCellText text-align-center ui-grid-cell-contents">' +
          '<a rp-node-selection-popover title="Select Tool Input"' +
          'ng-click="grid.appScope.openSelectionPopover(row.entity)"' +
          'id="{{row.entity.uuid}}">' +
          '<div class="full-size ui-grid-selection-row-header-buttons solidText">' +
          '<i class="fa fa-arrow-right" aria-hidden="true">' +
          '</i></div></a></div>';
        expect(response[3].cellTemplate).toContain(cellTemplate);
      });

      it('sets cellClass to a function for selection column', function () {
        expect(angular.isFunction(response[3].cellClass)).toBe(true);
      });

      it('sets headerCellClass to a function for selection column', function () {
        expect(angular.isFunction(response[3].headerCellClass)).toBe(true);
      });

      it('sets correct name and field for selection column', function () {
        expect(response[3].name).toEqual(tempAssayAttributes[3].display_name);
        expect(response[3].field).toEqual(tempAssayAttributes[3].display_name);
      });

      it('sets other default properities for selection column', function () {
        expect(response[3].cellTooltip).toEqual(false);
        expect(response[3].width).toEqual(50);
        expect(response[3].displayName).toEqual('');
        expect(response[3].enableFiltering).toEqual(false);
        expect(response[3].enableSorting).toEqual(false);
        expect(response[3].enableColumnMenu).toEqual(false);
        expect(response[3].enableColumnResizing).toEqual(true);
        expect(response[3].pinnedLeft).toEqual(true);
        expect(response[3].cellEditableCondition).toEqual(false);
      });

      // input groups column
      it('returns corrent template for input groups column', function () {
        var cellTemplate = '<rp-input-groups-column-template>' +
        '</rp-input-groups-column-template>';
        expect(response[4].cellTemplate).toContain(cellTemplate);
      });

      it('sets cellClass to a function for input groups column', function () {
        expect(angular.isFunction(response[4].cellClass)).toBe(true);
      });

      it('sets headerCellClass to a function for input groups column', function () {
        expect(angular.isFunction(response[4].headerCellClass)).toBe(true);
      });

      it('sets correct name and field for input groups column', function () {
        expect(response[4].name).toEqual(tempAssayAttributes[4].display_name);
        expect(response[4].field).toEqual(tempAssayAttributes[4].display_name);
      });

      it('sets correct display name for input groups column', function () {
        expect(response[4].displayName).toEqual('Input Groups');
      });

      it('sets other default properities for input groups column', function () {
        expect(response[4].width).toEqual(130);
        expect(response[4].enableFiltering).toEqual(false);
        expect(response[4].enableSorting).toEqual(false);
        expect(response[4].enableColumnMenu).toEqual(false);
        expect(response[4].enableColumnResizing).toEqual(true);
        expect(response[4].pinnedLeft).toEqual(true);
        expect(response[4].cellEditableCondition).toEqual(false);
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
