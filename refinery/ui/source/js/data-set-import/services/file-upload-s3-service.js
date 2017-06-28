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
      vm.bucket = new AWS.S3({
        params: { Bucket: settings.djangoApp.mediaBucket, maxRetries: 10 },
        httpOptions: { timeout: 360000 }
      });
    }, function (reason) {
      $log.error('Failed to obtain AWS OpenID Connect token: ' + reason);
    });

    this.progress = 0;
    this.upload = function (file) {
      var deferred = $q.defer();
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
      var uploader = vm.bucket.upload(params, options, function (err) {
        if (err) {
          $log.error('Error uploading file: ' + err);
          deferred.reject(err);
        }
        deferred.resolve();
      });
      uploader.on('httpUploadProgress', function (event) {
        deferred.notify(event);
      });

      return deferred.promise;
    };
  }
})();
