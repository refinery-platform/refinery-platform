'use strict';

describe('File Browser Factory', function () {
  var factory;
  var deferred;
  var rootScope;
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
  });

  describe('getAssayFiles', function () {
    var assayFiles;

    beforeEach(inject(function (assayFileService, $q, $rootScope) {
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
      rootScope = $rootScope;
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
      expect(angular.isFunction(factory.getAssayFiles)).toBe(true);
      expect(successData).toEqual(assayFiles);
    });
  });

  // describe('getAssayAttributeOrder', function () {
  //  var $httpBackend;
  //  var settings;
  //  var url;
  //
  //  beforeEach(inject(function (_$httpBackend_, _settings_) {
  //    $httpBackend = _$httpBackend_;
  //    settings = _settings_;
  //    url = settings.appRoot + settings.refineryApiV2 + '/assays/' +
  //      fakeUuid + '/attributes/';
  //  }));
  //
  //  it('getAssayAttributeOrder is a method', function () {
  //    expect(angular.isFunction(factory.getAssayAttributeOrder)).toBe(true);
  //  });
  //
  //  it('getAssayAttributeOrder makes success call', function () {
  //    var data;
  //    var testing;
  //
  //    $httpBackend.expect(
  //      'GET',
  //      url,
  //      { 'csrfmiddlewaretoken': fakeToken, 'uuid': fakeUuid },
  //      { "Accept":"application/json, text/plain, */*" }
  //    ).respond(200, {}, {});
  //    var response = factory.getAssayAttributeOrder(fakeUuid)
  //      .then(function () {
  //        data = 'SUCCESS';
  //      }, function(){
  //        data = 'ERROR';
  //      });
  //    $httpBackend.flush();
  //    expect(typeof response.then).toEqual('function');
  //    expect(data).toEqual('SUCCESS');
  //  });
  // });
});
