(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .service('s3UploadService', s3UploadService);

  s3UploadService.$inject = ['$q'];

  function s3UploadService ($q) {
    AWS.config.region = 'us-east-1';
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityId: '',
      Logins: {
        // eslint-disable-next-line max-len
        'cognito-identity.amazonaws.com': ''
      }
    });

    var bucket = new AWS.S3({
      params: { Bucket: 'scc-dev-media', maxRetries: 10 },
      httpOptions: { timeout: 360000 }
    });

    this.progress = 0;
    this.upload = function (file) {
      var deferred = $q.defer();
      var params = {
        Bucket: 'scc-dev-media',
        Key: 'uploads' + '/' + AWS.config.credentials.identityId + '/' + file.name,
        // Key: file.name,
        ContentType: file.type,
        Body: file
      };
      var options = {
        partSize: 50 * 1024 * 1024,  // bytes
        queueSize: 2,
        // Give the owner of the bucket full control
        ACL: 'bucket-owner-full-control'
      };
      var uploader = bucket.upload(params, options, function (err) {
        if (err) {
          console.error('Error uploading file: ' + err);
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
