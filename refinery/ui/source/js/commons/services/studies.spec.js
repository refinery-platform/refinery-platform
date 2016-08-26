'use strict';

describe('Common.service.studies: unit tests', function () {
  var $httpBackend;
  var $rootScope;
  var fakeUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
  var service;
  var settings;
  var fakeResponse = {
    objects: [{
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

  beforeEach(function () {
    module('refineryApp');

    inject(function ($injector) {
      settings = $injector.get('settings');
      $httpBackend = $injector.get('$httpBackend');
      $rootScope = $injector.get('$rootScope');
      service = $injector.get('studyService');
    });
  });

  describe('Service', function () {
    it('should be defined', function () {
      expect(service).toBeDefined();
    });

    it('should be a method', function () {
      expect(typeof service.query).toEqual('function');
    });

    it('should return a resolving promise for fakeUuid', function () {
      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApi +
          '/data_sets/' + fakeUuid + '/studies/'
      ).respond(200, fakeResponse);

      var studyResult;
      var promise = service.query({ uuid: fakeUuid })
        .$promise.then(function (response) {
          studyResult = response.objects[0];
        });

      expect(typeof promise.then).toEqual('function');
      $httpBackend.flush();
      $rootScope.$digest();
      var keys = Object.keys(fakeResponse.objects[0]);

      for (var i = 0; i < keys.length; i++) {
        expect(studyResult[keys[i]])
        .toEqual(fakeResponse.objects[0][keys[i]]);
      }
    });
  });
});
