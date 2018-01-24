'use strict';

describe('Data Set About Factory', function () {
  var factory;
  var deferred;
  var rootScope;
  var $q;
  var fakeUuid;
  var mocker;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryDataSetAbout'));
  beforeEach(inject(function (_dataSetAboutFactory_, _mockParamsFactory_) {
    factory = _dataSetAboutFactory_;
    mocker = _mockParamsFactory_;
    fakeUuid = mocker.generateUuid();
  }));

  it('factory and tools variables should exist', function () {
    expect(factory).toBeDefined();
    expect(factory.assays).toEqual([]);
    expect(factory.dataSet).toEqual({ });
    expect(factory.fileStoreItem).toEqual({ });
    expect(factory.investigation).toEqual({ });
    expect(factory.isaTab).toEqual({ });
    expect(factory.studies).toEqual([]);
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
          uuid: mocker.generateUuid()
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

  describe('getFileStoreItem', function () {
    var fileStore;

    beforeEach(inject(function (
      fileStoreItemService,
      _$q_,
      _$rootScope_
    ) {
      $q = _$q_;
      fileStore = {
        id: 42,
        filetype: 'Zip compressed archive',
        datafile: '/media/file_store/94/70/rfc-test_4_LYaeGAD.zip',
        uuid: fakeUuid,
        source: '/vagrant/media/file_store/temp/rfc-test_4.zip',
        import_task_id: '2638d2de-0ed3-439f-be74-d4631be0a58a',
        created: '2016-05-12T12:43:27.363785Z',
        updated: '2016-05-12T12:43:27.392864Z'
      };
      spyOn(fileStoreItemService, 'query').and.callFake(function () {
        deferred = $q.defer();
        deferred.resolve(fileStore);
        return {
          $promise: deferred.promise
        };
      });

      rootScope = _$rootScope_;
    }));

    it('getFileStoreItem is a method', function () {
      expect(angular.isFunction(factory.getFileStoreItem)).toBe(true);
    });

    it('getFileStoreItem returns a promise', function () {
      var successData;
      var response = factory.getFileStoreItem({
        uuid: fakeUuid
      }).then(function (responseData) {
        successData = responseData;
      });
      rootScope.$apply();
      expect(typeof response.then).toEqual('function');
      expect(successData).toEqual(fileStore);
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
          investigation_uuid: mocker.generateUuid(),
          protocols: [],
          publications: [],
          release_date: null,
          resource_uri: '/api/v1/study/8486046b-22f4-447f-9c81-41dbf6173c44/',
          sources: [],
          submission_date: '2013-03-22',
          title: 'RFC Documents',
          uuid: mocker.generateUuid()
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
});
