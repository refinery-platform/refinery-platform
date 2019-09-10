'use strict';

describe('Common.service.siteProfileV2Service: unit tests', function () {
  var httpBackend;
  var scope;
  var service;
  var siteProfile;
  var refinerySettings;

  beforeEach(module('refineryApp'));
  beforeEach(inject(function (
    $httpBackend,
    $rootScope,
    siteProfileService,
    settings
  ) {
    refinerySettings = settings;
    httpBackend = $httpBackend;
    scope = $rootScope;
    service = siteProfileService;

    siteProfile = {
      twitter_username: 'mockTwitterName',
      site_videos: '[{source_id:"yt_3452", source:"youtube", caption:"Analysis"}]',
      intro_markdown: 'Intro to the platform.',
      about_markdown: 'About the platform'
    };
  }));

  describe('Service', function () {
    it('should be defined', function () {
      expect(service).toBeDefined();
    });

    it('should be a method', function () {
      expect(typeof service).toEqual('function');
    });

    it('query should return a resolving promise', function () {
      httpBackend
        .expectGET(
          refinerySettings.appRoot +
          refinerySettings.refineryApiV2 +
          '/site_profiles/?current=true'
      ).respond(200, siteProfile);

      var results;
      var promise = service.query({ current: 'true' }).$promise
        .then(function (response) {
          results = response;
        });
      expect(typeof promise.then).toEqual('function');
      httpBackend.flush();
      scope.$digest();
      expect(results.twitter_username).toEqual(siteProfile.twitter_username);
    });

    it('patch should return a resolving promise', function () {
      var param = { intro_markdown: 'New intro paragraph.' };
      siteProfile.intro_markdown = param.intro_markdown;
      var mockResponse = { status: 202, data: siteProfile };
      httpBackend
        .expectPATCH(
          refinerySettings.appRoot +
          refinerySettings.refineryApiV2 +
          '/site_profiles/',
          param
      ).respond(202, mockResponse);

      var results;
      var promise = service.partial_update(param).$promise
        .then(function (response) {
          results = response;
        });

      expect(typeof promise.then).toEqual('function');
      httpBackend.flush();
      scope.$digest();
      expect(results.status).toEqual(mockResponse.status);
      expect(results.data.intro_markdown).toEqual(param.intro_markdown);
    });
  });
});
