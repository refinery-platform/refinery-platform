'use strict';

function RefineryFileUploadCtrl (
  $element,
  $log,
  $scope,
  $timeout,
  $window,
  $,
  chunkedUploadService,
  fileUploadStatusService,
  settings,
  SparkMD5,
  dataSetImportSettings,
  $uibModal,
  getCookie
) {
  $scope.fileStatus = fileUploadStatusService.fileUploadStatus;

  var csrftoken = getCookie('csrftoken');

  // The next function and jQuery call ensure that the `csrftoken` is used for
  // every request. This is needed because the _jQuery file upload_ plugin uses
  // jQuery's internal AJAX methods.
  function csrfSafeMethod (method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
  }
  $.ajaxSetup({
    beforeSend: function (xhr, settingsTwo) {
      if (!csrfSafeMethod(settingsTwo.type) && !this.crossDomain) {
        xhr.setRequestHeader('X-CSRFToken', csrftoken);
      }
    }
  });

  // var csrf = '';
  var formData = [];
  var md5 = {};
  var totalNumFilesQueued = 0;
  var totalNumFilesUploaded = 0;
  var currentUploadFile = -1;
  // Caches file names to avoid uploading multiple times the same file.
  var fileCache = {};

  $scope.queuedFiles = [];
  // This is set to true by default because this var is used to apply an
  // _active_ class to the progress bar so that it displays the moving stripes.
  // Setting it to false by default leads to an ugly flickering while the bar
  // progresses but the stripes are not displayed
  $scope.uploadActive = true;
  $scope.loadingFiles = false;

  $scope.readNextChunk = function (file) {
    var reader = new FileReader();

    reader.onload = function onload (event) {
      $scope.spark.append(event.target.result);  // append chunk
      $scope.currentChunk++;
      if ($scope.currentChunk >= $scope.chunks) {
        md5[file.name] = $scope.spark.end();  // This piece calculates the MD5
      }
    };

    var startIndex = $scope.currentChunk * $scope.options.chunkSize;
    var end = Math.min(startIndex + $scope.options.chunkSize, file.size);
    reader.readAsArrayBuffer($scope.slice.call(file, startIndex, end));
  };

  $.blueimp.fileupload.prototype.processActions = {
    calculate_checksum: function (data, options) {
      $scope.options = options;
      $scope.currentChunk = 0;
    //  var dfd = $.Deferred();  // eslint-disable-line new-cap
      var file = data.files[data.index];
      if (window.File) {
        $scope.slice = (
          window.File.prototype.slice ||
          window.File.prototype.mozSlice ||
          window.File.prototype.webkitSlice
        );
      }
      if (!$scope.slice && window.Blob) {
        $scope.slice = (
          window.Blob.prototype.slice ||
          window.Blob.prototype.mozSlice ||
          window.Blob.prototype.webkitSlice
        );
      }

      if (!$scope.slice) {
        $log.error('Neither the File API nor the Blob API are supported.');
        return undefined;
      }

      $scope.chunks = Math.ceil(file.size / options.chunkSize);
      $scope.currentChunk = 0;
      $scope.spark = new SparkMD5.ArrayBuffer();

      return 0;
    }
  };

  var uploadDone = function (event, data) {
    var file = data.files[0];

    function success () {
      totalNumFilesUploaded++;

      file.uploaded = true;

      if ($element.fileupload('active') > 0) {
        $scope.uploadActive = true;
        $scope.uploadInProgress = true;
        $scope.fileStatus = fileUploadStatusService.setFileUploadStatus('running');
      } else {
        $scope.uploadActive = false;
        $scope.uploadInProgress = false;
        $scope.fileStatus = fileUploadStatusService.setFileUploadStatus('queuing');
      }

      if (totalNumFilesUploaded === totalNumFilesQueued) {
        $scope.allUploaded = true;
        $scope.uploadActive = false;
        $scope.uploadInProgress = false;
        $scope.fileStatus = fileUploadStatusService.setFileUploadStatus('none');
      }

      $timeout(function () {
        // Fritz: I am not sure why we need to wait 100ms instead of 0ms
        // (i.e. one digestion) but this solves the issues with the last
        // progress bar not being changed into success mode.
        $scope.$apply();
      }, 100);
    }

    function error (errorMessage) {
      $log.error('Error uploading file!', errorMessage);
    }

    console.log(md5[file.name]);

    chunkedUploadService.save({
      upload_id: data.result.upload_id,
      md5: md5[file.name]
    })
    .$promise
    .then(success)
    .catch(error);
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

  var chunkSend = function (event, data) {
    console.log('chunksend');
    console.log(data);
    $scope.readNextChunk(data.files[0]);
  };

  var uploadAlways = function () {
    formData = [];  // clear formData, including upload_id for the next upload
  };

  // Tiggered when a new file is uploaded
  $element.on('fileuploadadd', function add (e, data) {
    if (fileCache[data.files[0].name]) {
      $log.error(
        'We currently do not support uploading multiple files with the same ' +
        'file name.'
      );
      return false;
    }
    totalNumFilesQueued++;
    $scope.queuedFiles.push(data.files[0]);
    fileCache[data.files[0].name] = true;
    $scope.fileStatus = fileUploadStatusService.setFileUploadStatus('queuing');
    return true;
  });

  // Triggered either when an upload failed or the user cancelled
  $element.on('fileuploadfail', function submit (e, data) {
    for (var i = $scope.queuedFiles.length; i--;) {
      if ($scope.queuedFiles[i].name === data.files[0].name) {
        $scope.queuedFiles.splice(i, 1);
      }
    }
    totalNumFilesQueued = Math.max(totalNumFilesQueued - 1, 0);

    fileCache[data.files[0].name] = undefined;
    delete fileCache[data.files[0].name];

    // wait for digest to complete
    $timeout(function () {
      if (totalNumFilesQueued === 0) {
        $scope.fileStatus = fileUploadStatusService.setFileUploadStatus('none');
      } else if ($element.fileupload('active') === 0) {
        $scope.fileStatus = fileUploadStatusService.setFileUploadStatus('queuing');
      }
    }, 110);
  });

  $element.on('fileuploadsubmit', function submit (event, data) {
    if (data.files[0].uploaded) {
      // don't upload again
      return false;
    }
    currentUploadFile++;
    $scope.fileStatus = fileUploadStatusService.setFileUploadStatus('running');
    return true;
  });

  $scope.globalReadableProgress = function (progress, index) {
    if (index < currentUploadFile) {
      return 100;
    }
    if (index === currentUploadFile) {
      return (progress || 0).toFixed(3);
    }
    return 0;
  };

  $scope.globalToIndividualProgress = function (progress, index) {
    if (index < currentUploadFile) {
      return +(100 / totalNumFilesQueued).toFixed(3);
    }
    if (index === currentUploadFile) {
      return +(progress / totalNumFilesQueued).toFixed(3);
    }
    return 0;
  };

  $scope.numUnfinishedUploads = function () {
    return totalNumFilesQueued - totalNumFilesUploaded;
  };

  $scope.openHelpMd5 = function () {
    $uibModal.open({
      templateUrl:
        '/static/partials/data-set-import/partials/dialog-help-md5.html',
      controller: 'RefineryFileUploadMD5HelpCtrl as modal'
    });
  };

  $scope.options = {
    always: uploadAlways,
    chunkdone: chunkDone,
    chunkfail: chunkFail,
    chunksend: chunkSend,
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
    '$window',
    '$',
    'chunkedUploadService',
    'fileUploadStatusService',
    'settings',
    'SparkMD5',
    'dataSetImportSettings',
    '$uibModal',
    'getCookie',
    RefineryFileUploadCtrl
  ]);
