(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .service('s3UploadService', s3UploadService);

  s3UploadService.$inject = ['$q'];

  function s3UploadService ($q) {
    AWS.config.region = 'us-east-1';
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: 'us-east-1:18d47236-7898-4c2a-9a0a-a150d49d76be'
    });

    var bucket = new AWS.S3({
      params: { Bucket: 'scc-dev-media', maxRetries: 10 },
      httpOptions: { timeout: 360000 }
    });

    this.progress = 0;
    this.upload = function (file) {
      var deferred = $q.defer();
      var params = {
        Bucket: 'scc-dev-media', Key: file.name, ContentType: file.type, Body: file
      };
      var options = {
        partSize: 50 * 1024 * 1024,  // bytes
        queueSize: 2,
        // Give the owner of the bucket full control
        ACL: 'bucket-owner-full-control'
      };
      var uploader = bucket.upload(params, options, function (err) {
        if (err) {
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
