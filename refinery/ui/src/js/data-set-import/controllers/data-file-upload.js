var md5 = {},  // dictionary of file names and hash values
    csrf = "",
    formData = [];
    if ($("input[name='csrfmiddlewaretoken']")[0]) {
      csrf = $("input[name='csrfmiddlewaretoken']")[0].value;
      formData = [{"name": "csrfmiddlewaretoken", "value": csrf}];
    }

function RefineryFileUploadCtrl($, $scope, dataSetImportSettings){
  "use strict";
  $scope.loadingFiles = false;
  $.blueimp.fileupload.prototype.processActions = {
    calculate_checksum: function (data, options) {
      var that = this;
      var dfd = $.Deferred();
      var file = data.files[data.index];
      var slice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice,
        chunks = Math.ceil(file.size / options.chunkSize),
        current_chunk = 0,
        spark = new SparkMD5.ArrayBuffer();
      function onload(e) {
        spark.append(e.target.result);  // append chunk
        current_chunk++;
        if (current_chunk < chunks) {
          read_next_chunk();
        } else {
          md5[file.name] = spark.end();
          dfd.resolveWith(that, [data]);
          console.log("Finished calculating checksum of " + file.name);
        }
      }
      function read_next_chunk() {
        var reader = new FileReader();
        reader.onload = onload;
        var start = current_chunk * options.chunkSize,
          end = Math.min(start + options.chunkSize, file.size);
        reader.readAsArrayBuffer(slice.call(file, start, end));
      }
      console.log("Calculating checksum of " + file.name);
      read_next_chunk();
      return dfd.promise();
    }
  };
  var uploadDone = function(e, data) {
    var file = data.files[0];
    console.log(
      "Finished uploading chunks for", file.name, "md5 =", md5[file.name]);
    $.ajax({
      type: "POST",
      url: dataSetImportSettings.uploadCompleteUrl,
      data: {
        csrfmiddlewaretoken: csrf,
        upload_id: data.result.upload_id,
        md5: md5[file.name]
      },
      dataType: "json",
      success: function(response) {
        console.log(response.message);
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.error("Error uploading file:", textStatus, "-", errorThrown);
      }
    });
  };
  var getFormData = function(form) {
    return formData;
  };
  var chunkDone = function(e, data) {
    if (formData.length < 2) {
      formData.push({"name": "upload_id", "value": data.result.upload_id});
    }
  };
  var chunkFail = function(e, data) {
    console.error("Error uploading file:", data.errorThrown, "-", data.textStatus);
  };
  var uploadAlways = function(e, data) {
    formData.splice(1);  // clear upload_id for the next upload
  };
  $scope.options = {
    formData: getFormData,
    chunkdone: chunkDone,
    chunkfail: chunkFail,
    done: uploadDone,
    always: uploadAlways
  };
}

function RefineryFileDestroyCtrl($scope, $http) {
  "use strict";
  var file = $scope.file,
    state;
  if (file.url) {
    file.$state = function () {
      return state;
    };
    file.$destroy = function () {
      state = 'pending';
      return $http({
        url: file.deleteUrl,
        method: file.deleteType
      }).then(
        function () {
          state = 'resolved';
          $scope.clear(file);
        },
        function () {
          state = 'rejected';
        }
      );
    };
  } else if (!file.$cancel && !file._index) {
    file.$cancel = function () {
      $scope.clear(file);
    };
  }
}

angular
  .module('refineryDataSetImport')
  .controller('RefineryFileUploadCtrl', [
    '$', '$scope', 'dataSetImportSettings', RefineryFileUploadCtrl
  ])
  .controller('RefineryFileDestroyCtrl', [
    '$scope', '$http', RefineryFileDestroyCtrl
  ]);
