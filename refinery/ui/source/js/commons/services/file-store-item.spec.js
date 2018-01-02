'use strict';

describe('Common.service.fileStoreItem: unit tests', function () {
  var $httpBackend;
  var $rootScope;
  var fakeUuid = '89774554-c1c4-459f-af3a-059de6eaffdf';
  var service;
  var settings;
  var fakeResponse = {
    id: 42,
    filetype: 'Zip compressed archive',
    datafile: '/media/file_store/94/70/rfc-test_4_LYaeGAD.zip',
    uuid: fakeUuid,
    source: '/vagrant/media/file_store/temp/rfc-test_4.zip',
    import_task_id: '2638d2de-0ed3-439f-be74-d4631be0a58a',
    created: '2016-05-12T12:43:27.363785Z',
    updated: '2016-05-12T12:43:27.392864Z'
  };

  beforeEach(function () {
    module('refineryApp');

    inject(function ($injector) {
      settings = $injector.get('settings');
      $httpBackend = $injector.get('$httpBackend');
      $rootScope = $injector.get('$rootScope');
      service = $injector.get('fileStoreItemService');
    });
  });

  describe('Service', function () {
    it('should be defined', function () {
      expect(service).toBeDefined();
    });

    it('should be a method', function () {
      expect(typeof service.query).toEqual('function');
    });

    it('should return a resolving promise for fakeUuids', function () {
      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApiV2 +
          '/file_store_items/' + fakeUuid + '/'
      ).respond(200, fakeResponse);

      var results;
      var promise = service.query({ uuid: fakeUuid })
        .$promise.then(function (response) {
          results = response;
        });

      expect(typeof promise.then).toEqual('function');
      $httpBackend.flush();
      $rootScope.$digest();
      var keys = Object.keys(fakeResponse);

      for (var i = 0; i < keys.length; i++) {
        expect(results[keys[i]])
        .toEqual(fakeResponse[keys[i]]);
      }
    });
  });
});
