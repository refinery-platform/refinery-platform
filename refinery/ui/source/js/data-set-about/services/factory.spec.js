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
    expect(factory.studies).toEqual([]);
    expect(factory.assays).toEqual([]);
    expect(factory.ownerProfile).toEqual({});
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

  describe('getStudies', function () {
    var studyResult;

    beforeEach(inject(function (
      studyService,
      _$q_,
      _$rootScope_
    ) {
      $q = _$q_;
      studyResult = { objects:
        [{
          description: 'A collection of RFC documents.',
          file_name: 's_study.txt',
          id: 10,
          identifier: 'IETF Request for Comments',
          investigation_uuid: '120f31a7-0f3a-4359-ab7b-4a83247c7887',
          protocols: [],
          publications: [],
          release_date: null,
          resource_uri: '/api/v1/study/8486046b-22f4-447f-9c81-41dbf6173c44/',
          sources: [],
          submission_date: '2013-03-22',
          title: 'RFC Documents',
          uuid: '8486046b-22f4-447f-9c81-41dbf6173c44'
        }]
      };
      spyOn(studyService, 'query').and.callFake(function () {
        deferred = $q.defer();
        deferred.resolve(studyResult);
        return {
          $promise: deferred.promise
        };
      });

      rootScope = _$rootScope_;
    }));

    it('getDataSet is a method', function () {
      expect(angular.isFunction(factory.getStudies)).toBe(true);
    });

    it('getDataSet returns a promise', function () {
      var successData;
      var response = factory.getStudies({
        uuid: fakeUuid
      }).then(function (responseData) {
        successData = responseData;
      });
      rootScope.$apply();
      expect(typeof response.then).toEqual('function');
      expect(successData).toEqual(studyResult);
    });
  });

  describe('getStudysAssays', function () {
    var assayResult;

    beforeEach(inject(function (
      assayService,
      _$q_,
      _$rootScope_
    ) {
      $q = _$q_;
      assayResult = [{
        file_name: 'a_assay.txt',
        measurement: '1969 - 1979',
        measurement_accession: '',
        measurement_source: '',
        platform: '',
        study: 10,
        technology: '',
        technology_accession: null,
        technology_source: '',
        uuid: fakeUuid
      }];
      spyOn(assayService, 'query').and.callFake(function () {
        deferred = $q.defer();
        deferred.resolve(assayResult);
        return {
          $promise: deferred.promise
        };
      });

      rootScope = _$rootScope_;
    }));

    it('getStudysAssay is a method', function () {
      expect(angular.isFunction(factory.getStudysAssays)).toBe(true);
    });

    it('getStudysAssay returns a promise', function () {
      var successData;
      var response = factory.getStudysAssays({
        uuid: fakeUuid
      }).then(function (responseData) {
        successData = responseData;
      });
      rootScope.$apply();
      expect(typeof response.then).toEqual('function');
      expect(successData).toEqual(assayResult);
    });
  });

  describe('getDataSharingSet', function () {
    var dataSetSharingResult;

    beforeEach(inject(function (
      sharingService,
      _$q_,
      _$rootScope_
    ) {
      $q = _$q_;
      dataSetSharingResult = {
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
        share_list: [
          {
            group_id: 100,
            group_name: 'Public',
            perms: {
              change: false,
              read: false
            }
          }
        ],
        slug: null,
        summary: '',
        title: 'Request for Comments (RFC) Test',
        uuid: 'db03efb7-cf01-4840-bcb2-7b023efc290c'
      };
      spyOn(sharingService, 'query').and.callFake(function () {
        deferred = $q.defer();
        deferred.resolve(dataSetSharingResult);
        return {
          $promise: deferred.promise
        };
      });

      rootScope = _$rootScope_;
    }));

    it('getDataSetSharing is a method', function () {
      expect(angular.isFunction(factory.getDataSetSharing)).toBe(true);
    });

    it('getDataSetSharing returns a promise', function () {
      var successData;
      var response = factory.getDataSetSharing({
        uuid: fakeUuid,
        model: 'data_sets'
      }).then(function (responseData) {
        successData = responseData;
      });
      rootScope.$apply();
      expect(typeof response.then).toEqual('function');
      expect(successData).toEqual(dataSetSharingResult);
    });
  });

  describe('getOwnerName', function () {
    var ownerResult;
    var userService;

    beforeEach(inject(function (_userService_) {
      userService = _userService_;
      ownerResult = {
        affiliation: '',
        email: 'guest@example.com',
        firstName: 'Guest',
        fullName: 'Guest',
        lastName: '',
        userId: 2,
        userName: 'guest',
        userProfileUuid: '5377caec-0e4f-4de5-9db5-3214b6ef0857'
      };
    }));

    it('getOwnerName is a method', function () {
      expect(angular.isFunction(factory.getOwnerName)).toBe(true);
    });

    it('getOwnerName returns a promise', function () {
      var response = {};
      spyOn(userService, 'get').and.callFake(function () {
        return {
          then: function () {
            response = ownerResult;
          }
        };
      });
      expect(response).toEqual({});
      factory.getOwnerName({ uuid: fakeUuid });
      expect(response).toEqual(ownerResult);
    });
  });
});
