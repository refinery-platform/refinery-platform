(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .service('s3UploadService', s3UploadService);

  s3UploadService.$inject = ['$log', '$q', 'openIdTokenService', 'settings'];

  function s3UploadService ($log, $q, openIdTokenService, settings) {
    var vm = this;

    openIdTokenService.query(function (response) {
      AWS.config.region = response.Region;
      AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityId: response.IdentityId,
        Logins: { 'cognito-identity.amazonaws.com': response.Token }
      });
      vm.s3 = new AWS.S3({
        params: { Bucket: settings.djangoApp.mediaBucket, maxRetries: 10 },
        httpOptions: { timeout: 360000 }
      });
    }, function (reason) {
      $log.error('Failed to obtain AWS OpenID Connect token: ' + reason);
      // TODO: provide information about the error to the user (block import?)
    });

    vm.upload = function (file) {
      var params = {
        Bucket: settings.djangoApp.mediaBucket,
        Key: 'uploads' + '/' + AWS.config.credentials.identityId + '/' + file.name,
        ContentType: file.type,
        Body: file
      };
      var options = {
        partSize: 50 * 1024 * 1024,  // bytes
        queueSize: 2,
        // Give the owner of the bucket full control
        ACL: 'bucket-owner-full-control'
      };
      return vm.s3.upload(params, options);  // AWS.S3.ManagedUpload
    };
  }
})();
