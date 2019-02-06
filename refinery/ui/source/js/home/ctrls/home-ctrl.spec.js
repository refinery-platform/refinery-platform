(function () {
  'use strict';

  describe('Controller: Home Ctrl', function () {
    var ctrl;
    var markdown;
    var responseSiteProfile = {
      intro_markdown: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
      'Vivamus ante justo, tempus sit amet lobortis a, dapibus vitae metus.',
      about_markdown: 'Aliquam scelerisque dictum molestie. Proin ac pl magna.',
      twitter_username: 'mockUserName',
      site_videos: []
    };
    var scope;
    var window;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryHome'));
    beforeEach(inject(function (
      $controller,
      MarkdownJS,
      $rootScope,
      $q,
      $window,
      siteProfileService
    ) {
      scope = $rootScope.$new();
      spyOn(siteProfileService, 'query').and.callFake(function () {
        var deferred = $q.defer();
        deferred.resolve(responseSiteProfile);
        return {
          $promise: deferred.promise
        };
      });
      ctrl = $controller('HomeCtrl', {
        $scope: scope
      });
      markdown = MarkdownJS;
      window = $window;
      window.djangoApp = {
        refineryInstanceName: 'Refinery Platform',
        userId: undefined
      };
    }));

    it('HomeCtrl ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('initalizes view params to empty strings', function () {
      expect(ctrl.aboutHTML).toEqual('');
      expect(ctrl.introHTML).toEqual('');
    });

    it('sets about paragraph', function () {
      scope.$apply();
      expect(ctrl.aboutHTML).toEqual(
        markdown.toHTML(responseSiteProfile.about_markdown)
      );
    });

    it('sets intro paragraph', function () {
      scope.$apply();
      expect(ctrl.introHTML).toEqual(
        markdown.toHTML(responseSiteProfile.intro_markdown)
      );
    });

    it('sets refinery instance name', function () {
      ctrl.$onInit();
      expect(ctrl.instanceName).toEqual(window.djangoApp.refineryInstanceName);
    });

    it('sets isLoggedIn to false for anon users', function () {
      expect(ctrl.isLoggedIn).toBe(false);
    });
  });
})();
