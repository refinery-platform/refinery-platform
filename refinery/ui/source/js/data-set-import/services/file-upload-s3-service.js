(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .service('s3UploadService', s3UploadService);

  s3UploadService.$inject = ['$log', 'openIdTokenService', 'settings'];

  function s3UploadService ($log, openIdTokenService, settings) {
    var vm = this;
    vm.isConfigReady = false;

    openIdTokenService.query(function (response) {
      AWS.config.region = response.Region;
      AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityId: response.IdentityId,
        Logins: { 'cognito-identity.amazonaws.com': response.Token }
      });
      vm.s3obj = new AWS.S3({
        params: { Bucket: settings.djangoApp.mediaBucket, maxRetries: 10 },
        httpOptions: { timeout: 360000 }
      });
      AWS.config.credentials.getPromise().then(function () {
        vm.isConfigReady = true;
      }, function (error) {
        $log.error('Failed to obtain credentials using Cognito Identity service: ' + error);
        vm.isConfigReady = true;
      });
    }, function (response) {
      $log.error('Failed to obtain AWS OpenID Connect token: ' + response.statusText);
      vm.isConfigReady = true;
    });

    vm.isConfigValid = function () {
      if (AWS.config.region &&
          AWS.config.credentials &&
          AWS.config.credentials.identityId &&
          AWS.config.credentials.accessKeyId &&
          AWS.config.credentials.secretAccessKey &&
          vm.s3obj) {
        return true;
      }
      $log.error('Error configuring S3 interface object');
      return false;
    };

    vm.upload = function (file) {
      if (!vm.isConfigValid()) {
        throw Error('Error configuring S3 interface object');
      }
      var params;
      try {
        params = {
          Bucket: settings.djangoApp.mediaBucket,
          Key: 'uploads' + '/' + AWS.config.credentials.identityId + '/' + file.name,
          ContentType: file.type,
          Body: file
        };
      } catch (e) {
        $log.error('Error setting S3 upload parameters: ' + e.name + ': ' + e.message);
        throw e;
      }
      var options = {
        partSize: 50 * 1024 * 1024,  // bytes
        queueSize: 2,
        // Give the owner of the bucket full control
        ACL: 'bucket-owner-full-control'
      };
      return vm.s3obj.upload(params, options);  // AWS.S3.ManagedUpload
    };
  }
})();
