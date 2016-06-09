'use strict';

describe('Data Set About Factory', function () {
  var factory;
  var deferred;
  var rootScope;
  var $q;
  var fakeUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryDataSetAbout'));
  beforeEach(inject(function (_dataSetAboutFactory_) {
    factory = _dataSetAboutFactory_;
  }));

  it('factory and tools variables should exist', function () {
    expect(factory).toBeDefined();
    expect(factory.dataSet).toEqual({ });
  });

  describe('getDataSet', function () {
    var dataSet;

    beforeEach(inject(function (
      dataSetService,
      _$q_,
      _$rootScope_
    ) {
      $q = _$q_;
      dataSet = { objects:
        [{
          accession: 'Test 1',
          accession_source: null,
          creation_date: '2016-05-12T08:43:30.362877',
          description: '',
          file_count: 62,
          file_size: 75234,
          id: 5,
          is_owner: true,
          is_shared: false,
          isa_archive: '89774554-c1c4-459f-af3a-059de6eaffdf',
          modification_date: '2016-05-27T09:33:18.696246',
          name: 'Test 1: Request for Comments (RFC) Test',
          owner: '5377caec-0e4f-4de5-9db5-3214b6ef0857',
          public: false,
          resource_uri: '/api/v1/data_sets/db03efb7-cf01-4840-bcb2-7b023efc290c/',
          share_list: null,
          slug: null,
          summary: '',
          title: 'Request for Comments (RFC) Test',
          uuid: 'db03efb7-cf01-4840-bcb2-7b023efc290c'
        }]
      };
      spyOn(dataSetService, 'query').and.callFake(function () {
        deferred = $q.defer();
        deferred.resolve(dataSet);
        return {
          $promise: deferred.promise
        };
      });

      rootScope = _$rootScope_;
    }));

    it('getDataSet is a method', function () {
      expect(angular.isFunction(factory.getDataSet)).toBe(true);
    });

    it('getDataSet returns a promise', function () {
      var successData;
      var response = factory.getDataSet({
        uuid: fakeUuid
      }).then(function (responseData) {
        successData = responseData;
      });
      rootScope.$apply();
      expect(typeof response.then).toEqual('function');
      expect(successData).toEqual(dataSet);
    });
  });
});
