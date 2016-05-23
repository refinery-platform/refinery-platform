'use strict';

function RefineryFileUploadCtrl (
  $element,
  $log,
  $scope,
  $timeout,
  $,
  settings,
  SparkMD5,
  dataSetImportSettings,
  $uibModal
) {
  var csrf = '';
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

  if ($('input[name=\'csrfmiddlewaretoken\']')[0]) {
    csrf = $('input[name=\'csrfmiddlewaretoken\']')[0].value;
    formData = [{
      name: 'csrfmiddlewaretoken',
      value: csrf
    }];
  } else {
    $log.error('CSRF middleware token was not found in the upload form');
  }

  var worker = false;

  function workerCode () {
    // Default setting
    var chunkSize = 2097152;

    function calcMD5 (file) {
      var slice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
      var chunks = Math.ceil(file.size / chunkSize);
      var spark = new self.SparkMD5.ArrayBuffer();
      var currentChunk = 0;

      var reader = new FileReader();

      function readNextChunk () {
        reader.onload = function onload (event) {
          spark.append(event.target.result);  // append chunk
          currentChunk++;
          if (currentChunk < chunks) {
            readNextChunk();
          } else {
            postMessage({
              name: file.name,
              md5: spark.end()
            });
          }
        };

        reader.onerror = function (event) {
          postMessage({ name: file.name, error: event.message });
        };

        var startIndex = currentChunk * chunkSize;
        var end = Math.min(startIndex + chunkSize, file.size);
        reader.readAsArrayBuffer(slice.call(file, startIndex, end));
      }

      readNextChunk();
    }

    onmessage = function (event) {  // eslint-disable-line no-undef
      // importScripts only works with absolute URLs when the worker is
      // created inline. Find out more here:
      // http://www.html5rocks.com/en/tutorials/workers/basics/
      importScripts(  // eslint-disable-line no-undef
        event.data[0] +
        '/static/vendor/spark-md5/spark-md5.min.js'
      );

      chunkSize = event.data[2];

      calcMD5(event.data[1]);
    };
  }

  if (window.Worker) {
    var code = workerCode.toString();
    code = code.substring(code.indexOf('{') + 1, code.lastIndexOf('}'));

    var blob = new Blob([code], { type: 'application/javascript' });

    worker = new Worker(URL.createObjectURL(blob));
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

        reader.onload = function onload (event) {
          spark.append(event.target.result);  // append chunk
          currentChunk++;
          if (currentChunk < chunks) {
            readNextChunk();
          } else {
            md5[file.name] = spark.end();  // This piece calculates the MD5 hash
            dfd.resolveWith(that, [data]);
          }
        };

        var startIndex = currentChunk * options.chunkSize;
        var end = Math.min(startIndex + options.chunkSize, file.size);
        reader.readAsArrayBuffer(slice.call(file, startIndex, end));
      }

      if (worker) {
        worker.postMessage([
          settings.appRoot,
          file,
          options.chunkSize
        ]);

        worker.onmessage = function (event) {
          md5[file.name] = event.data.md5;
          dfd.resolveWith(that, [data]);
        };
      } else {
        readNextChunk();
      }

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
  });

  $element.on('fileuploadsubmit', function submit (event, data) {
    if (data.files[0].uploaded) {
      // don't upload again
      return false;
    }
    currentUploadFile++;
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
    'settings',
    'SparkMD5',
    'dataSetImportSettings',
    '$uibModal',
    RefineryFileUploadCtrl
  ]);
