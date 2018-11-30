(function () {
  'use strict';

  describe('Controller: Download Files Ctrl', function () {
    var ctrl;
    var rootScope;
    var service;
    var deferred;
    var mockToken;

    beforeEach(module('refineryApp'));
    beforeEach(inject(function (
      $controller, $q, $rootScope, mockParamsFactory, authTokenService
    ) {
      rootScope = $rootScope;
      service = authTokenService;
      mockToken = mockParamsFactory.generateUuid();

      deferred = $q.defer();
      deferred.resolve({ token: mockToken });
      spyOn(service, 'query').and.returnValue({ $promise: deferred.promise });

      ctrl = $controller('DownloadFilesCtrl', {
        $scope: rootScope,
        authTokenService: service
      });

      rootScope.$apply();
    }));

    it('Download Files ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Expect downloadCsvCurl method should exist', function () {
      expect(angular.isFunction(ctrl.downloadCsvCurl)).toBe(true);
    });

    it('Expect authToken to be set', function () {
      expect(ctrl.authToken).toEqual(mockToken);
    });

    it('Expect downloadCsvCurl to return valid cURL command with authToken', function () {
      expect(ctrl.downloadCsvCurl('testParam')).toEqual(
        'curl \'http://server:80/files_download?testParam\' -H' +
        ' "Authorization:  Token ' + mockToken + '" | tail -n +2 | cut -f 1' +
      ' -d \',\' | grep -v \'N/A\' | grep -v \'PENDING\' | xargs -n 1 curl -O -L'
      );
    });
  });
})();
