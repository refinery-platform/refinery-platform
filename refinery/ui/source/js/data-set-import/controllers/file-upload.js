'use strict';

function RefineryFileUploadCtrl (
  $element,
  $log,
  $q,
  $scope,
  SparkMD5,
  $timeout,
  $window,
  $,
  chunkedUploadService,
  fileUploadStatusService,
  settings,
  dataSetImportSettings,
  getCookie
) {
  var vm = this;
  vm.overallFileStatus = fileUploadStatusService.fileUploadStatus;

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

  var formData = [];
  var md5 = {};
  var totalNumFilesQueued = 0;
  var totalNumFilesUploaded = 0;
  var currentUploadFile = -1;
  // Caches file names to avoid uploading multiple times the same file.
  vm.fileCache = {};
  var chunkSize = dataSetImportSettings.chunkSize;
  // objects containing each files current chunk index for md5 calculation
  var chunkIndex = {};
  // objects containing each files chunk length
  var chunkLength = {};

  vm.queuedFiles = [];
  // This is set to true by default because this var is used to apply an
  // _active_ class to the progress bar so that it displays the moving stripes.
  // Setting it to false by default leads to an ugly flickering while the bar
  // progresses but the stripes are not displayed

  var setBrowserSliceProperty = function () {
    if (window.File) {
      vm.slice = (
        window.File.prototype.slice ||
        window.File.prototype.mozSlice ||
        window.File.prototype.webkitSlice
      );
    }

    if (!vm.slice && window.Blob) {
      vm.slice = (
        window.Blob.prototype.slice ||
        window.Blob.prototype.mozSlice ||
        window.Blob.prototype.webkitSlice
      );
    }

    if (!vm.slice) {
      $log.error('Neither the File API nor the Blob API are supported.');
    }
  };

  var calculateMD5 = function (file) {
    var deferred = $q.defer();

    var reader = new FileReader();

    if (chunkIndex[file.name] === 0) {
      chunkLength[file.name] = Math.ceil(file.size / chunkSize);
      vm.spark = new SparkMD5.ArrayBuffer();
    }

    reader.onload = function onload (event) {
      vm.spark.append(event.target.result);  // append chunk
      chunkIndex[file.name]++;
      if (chunkIndex[file.name] === chunkLength[file.name]) {
        md5[file.name] = vm.spark.end();  // This piece calculates the MD5
      }
      deferred.resolve();
    };

    reader.onerror = function (event) {
      postMessage({ name: file.name, error: event.message });
    };

    // loads next chunk
    var startIndex = chunkIndex[file.name] * chunkSize;
    var end = Math.min(startIndex + chunkSize, file.size);
    reader.readAsArrayBuffer(vm.slice.call(file, startIndex, end));

    return deferred.promise;
  };

  // Helper method to remove file from queue and cache
  var removeFileFromQueue = function (file) {
    for (var i = vm.queuedFiles.length; i--;) {
      if (vm.queuedFiles[i].name === file.name) {
        vm.queuedFiles.splice(i, 1);
      }
    }
    totalNumFilesQueued = Math.max(totalNumFilesQueued - 1, 0);
    vm.fileCache[file.name].isRunning = undefined;
    vm.fileCache[file.name].upload_id = undefined;
    delete vm.fileCache[file.name];
  };

  // occurs after files are adding to the queue
  $.blueimp.fileupload.prototype.processActions = {
    initializeChunkIndex: function (data) {
      var file = data.files[data.index];
      // Set chunk index
      chunkIndex[file.name] = 0;
    }
  };

  var uploadDone = function (event, data) {
    var file = data.files[0];
    vm.fileCache[data.files[0].name].status = 'waitingOnMD5';

    function success () {
      totalNumFilesUploaded++;
      file.uploaded = true; // used to prevent duplicate uploads
      vm.fileCache[data.files[0].name].status = 'uploaded';
      if ($element.fileupload('active') > 0) {
        vm.overallFileStatus = fileUploadStatusService.setFileUploadStatus('running');
      } else if (totalNumFilesUploaded === totalNumFilesQueued) {
        vm.overallFileStatus = fileUploadStatusService.setFileUploadStatus('none');
      } else {
        vm.overallFileStatus = fileUploadStatusService.setFileUploadStatus('queuing');
      }

      $timeout(function () {
        // Fritz: I am not sure why we need to wait 100ms instead of 0ms
        // (i.e. one digestion) but this solves the issues with the last
        // progress bar not being changed into success mode.
        $scope.$apply();
      }, 100);
    }

    function error (errorMessage) {
      totalNumFilesQueued--;
      // delete partial chunked file
      chunkedUploadService.remove({
        upload_id: data.result.upload_id
      }).$promise.then(function (response) {
        $log.info(response);
      }, function (response) {
        $log.error(response);
      });
      $log.error('Error uploading file!', errorMessage);
      file.error = 'Upload failed, re-add file to retry upload.';
      // Remove the error file from cache, so user can readd and upload
      removeFileFromQueue(file);
    }

    // calculate md5 before complete file save (for last chunk or small files)
    calculateMD5(file).then(function () {
      chunkedUploadService.save({
        upload_id: data.result.upload_id,
        md5: md5[file.name]
      }).$promise.then(success, error);
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
    // add upload id to fileCache object for possible cancelation/deletion
    if (data.hasOwnProperty('result') &&
      !vm.fileCache[data.files[0].name].hasOwnProperty('upload_id')) {
      vm.fileCache[data.files[0].name].upload_id = data.result.upload_id;
    }
  };

  var chunkFail = function (event, data) {
    $log.error('Error uploading file:', data.errorThrown, '-', data.textStatus);
  };

  // MD5 calculate after chunks are sent successfully
  var chunkSend = function (event, data) {
    var file = data.files[0];
    // final md5 calculated in upload done with the chunkedUploadComplete.
    if (chunkIndex[file.name] === 0 || chunkIndex[file.name] < chunkLength[file.name]) {
      calculateMD5(file);
    }
  };

  var uploadAlways = function () {
    formData = [];  // clear formData, including upload_id for the next upload
  };

  // Tiggered when a new file is uploaded
  $element.on('fileuploadadd', function add (e, data) {
    if (vm.fileCache.hasOwnProperty(data.files[0].name)) {
      $log.error(
        'We currently do not support uploading multiple files with the same ' +
        'file name.'
      );
      return false;
    }
    totalNumFilesQueued++;
    vm.queuedFiles.push(data.files[0]);
    vm.fileCache[data.files[0].name] = { status: 'queued' };
    vm.overallFileStatus = fileUploadStatusService.setFileUploadStatus('queuing');
    return true;
  });

  // Triggered either when an upload failed or the user cancelled
  $element.on('fileuploadfail', function submit (e, data) {
    totalNumFilesQueued--;
    // delete partial chunked file
    if (vm.fileCache[data.files[0].name].hasOwnProperty('upload_id')) {
      chunkedUploadService.remove({
        upload_id: vm.fileCache[data.files[0].name].upload_id
      }).$promise.then(function (response) {
        $log.info(response);
      }, function (response) {
        $log.error(response);
      });
    }
    removeFileFromQueue(data.files[0]);

    // wait for digest to complete
    $timeout(function () {
      if (totalNumFilesQueued === 0) {
        vm.fileStatus = fileUploadStatusService.setFileUploadStatus('none');
      } else if ($element.fileupload('active') === 0) {
        vm.fileStatus = fileUploadStatusService.setFileUploadStatus('queuing');
      }
    }, 110);
  });

  $element.on('fileuploadsubmit', function submit (event, data) {
    if (data.files[0].uploaded) {
      // don't upload again
      return false;
    }
    currentUploadFile++;
    vm.overallFileStatus = fileUploadStatusService.setFileUploadStatus('running');
    vm.fileCache[data.files[0].name].status = 'running';
    return true;
  });

  vm.globalReadableProgress = function (progress, index) {
    if (index < currentUploadFile) {
      return 100;
    }
    if (index === currentUploadFile) {
      return (progress || 0).toFixed(3);
    }
    return 0;
  };

  vm.globalToIndividualProgress = function (progress, index) {
    if (index < currentUploadFile) {
      return +(100 / totalNumFilesQueued).toFixed(3);
    }
    if (index === currentUploadFile) {
      return +(progress / totalNumFilesQueued).toFixed(3);
    }
    return 0;
  };

  vm.numUnfinishedUploads = function () {
    return totalNumFilesQueued - totalNumFilesUploaded;
  };

  vm.options = {
    always: uploadAlways,
    chunkdone: chunkDone,
    chunkfail: chunkFail,
    chunksend: chunkSend,
    done: uploadDone,
    formData: getFormData
  };

  setBrowserSliceProperty();
}

angular
  .module('refineryDataSetImport')
  .controller('RefineryFileUploadCtrl', [
    '$element',
    '$log',
    '$q',
    '$scope',
    'SparkMD5',
    '$timeout',
    '$window',
    '$',
    'chunkedUploadService',
    'fileUploadStatusService',
    'settings',
    'dataSetImportSettings',
    'getCookie',
    RefineryFileUploadCtrl
  ]);
