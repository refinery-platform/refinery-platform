'use strict';

function RefineryFileUploadCtrl (
  $element,
  $log,
  $scope,
  $timeout,
  $,
  SparkMD5,
  dataSetImportSettings
) {
  var csrf = '';
  var formData = [];
  var md5 = {};
  var totalNumFilesQueued = 0;
  var totalNumFilesUploaded = 0;
  var globalProgress = 0;

  // This is set to true by default because this var is used to apply an
  // _active_ class to the progress bar so that it displays the moving stripes.
  // Setting it to false by default leads to an ugly flickering while the bar
  // progresses but the stripes are not displayed
  $scope.uploadActive = true;
  $scope.loadingFiles = false;

  if ($('input[name=\'csrfmiddlewaretoken\']')[0]) {
    csrf = $('input[name=\'csrfmiddlewaretoken\']')[0].value;
    formData = [{
      name: 'csrfmiddlewaretoken',
      value: csrf
    }];
  } else {
    $log.error('CSRF middleware token was not found in the upload form');
  }

  $.blueimp.fileupload.prototype.processActions = {
    calculate_checksum: function (data, options) {
      var that = this;
      var dfd = $.Deferred();  // eslint-disable-line new-cap
      var file = data.files[data.index];
      var slice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
      var chunks = Math.ceil(file.size / options.chunkSize);
      var currentChunk = 0;
      var spark = new SparkMD5.ArrayBuffer();

      function readNextChunk () {
        var reader = new FileReader();
        // We have to disable eslint here because this is a circular dependency
        reader.onload = onload;   // eslint-disable-line no-use-before-define
        var startIndex = currentChunk * options.chunkSize;
        var end = Math.min(startIndex + options.chunkSize, file.size);
        reader.readAsArrayBuffer(slice.call(file, startIndex, end));
      }

      function onload (e) {
        spark.append(e.target.result);  // append chunk
        currentChunk++;
        if (currentChunk < chunks) {
          readNextChunk();
        } else {
          md5[file.name] = spark.end();
          dfd.resolveWith(that, [data]);
        }
      }

      readNextChunk();
      return dfd.promise();
    }
  };

  var uploadDone = function (e, data) {
    var file = data.files[0];

    $.ajax({
      type: 'POST',
      url: dataSetImportSettings.uploadCompleteUrl,
      data: {
        csrfmiddlewaretoken: csrf,
        upload_id: data.result.upload_id,
        md5: md5[file.name]
      },
      dataType: 'json',
      success: function () {
        totalNumFilesUploaded++;
        globalProgress = totalNumFilesUploaded / totalNumFilesQueued;

        file.uploaded = true;

        if ($element.fileupload('active') > 0) {
          $scope.uploadActive = true;
          $scope.uploadInProgress = true;
        } else {
          $scope.uploadActive = false;
          $scope.uploadInProgress = false;
        }

        if (totalNumFilesUploaded === totalNumFilesQueued) {
          $scope.allUploaded = true;
          $scope.uploadActive = false;
          $scope.uploadInProgress = false;
        }

        $timeout(function () {
          // Fritz: I am not sure why we need to wait 100ms instead of 0ms
          // (i.e. one digestion) but this solves the issues with the last
          // progress bar not being changed into success mode.
          $scope.$apply();
        }, 100);
      },
      error: function (jqXHR, textStatus, errorThrown) {
        $log.error('Error uploading file:', textStatus, '-', errorThrown);
      }
    });
  };

  var getFormData = function () {
    return formData;
  };

  var chunkDone = function (event, data) {
    if (formData.length < 2) {
      formData.push({
        name: 'upload_id',
        value: data.result.upload_id
      });
    }
  };

  var chunkFail = function (event, data) {
    $log.error('Error uploading file:', data.errorThrown, '-', data.textStatus);
  };

  var uploadAlways = function () {
    formData.splice(1);  // clear upload_id for the next upload
  };

  $element.on('fileuploadadd', function add () {
    totalNumFilesQueued++;
    globalProgress = totalNumFilesUploaded / totalNumFilesQueued;
  });

  $element.on('fileuploadfail', function submit () {
    totalNumFilesQueued = Math.max(totalNumFilesQueued - 1, 0);
  });

  $scope.globalReadableProgress = function (progress) {
    return Math.round(progress * globalProgress);
  };

  $scope.numUnfinishedUploads = function () {
    return totalNumFilesQueued - totalNumFilesUploaded;
  };

  $scope.options = {
    always: uploadAlways,
    chunkdone: chunkDone,
    chunkfail: chunkFail,
    done: uploadDone,
    formData: getFormData
  };
}

angular
  .module('refineryDataSetImport')
  .controller('RefineryFileUploadCtrl', [
    '$element',
    '$log',
    '$scope',
    '$timeout',
    '$',
    'SparkMD5',
    'dataSetImportSettings',
    RefineryFileUploadCtrl
  ]);
