angular.module('refineryDataFileUpload', ['blueimp.fileupload'])

.config([
  '$httpProvider', 'fileUploadProvider',
  function ($httpProvider, fileUploadProvider) {
    "use strict";
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
    // file upload settings:
    //angular.extend(fileUploadProvider.defaults, {
    //  maxChunkSize: chunkSize,
    //  sequentialUploads: true,
    //  autoUpload: false,
    //  formData: getFormData,
    //  chunkdone: chunkDone,
    //  submit: uploadSubmit,
    //  done: uploadDone,
    //  fail: uploadFail
    //});
  }
])

.controller('RefineryFileUploadController', [
  '$scope', '$http', '$filter', '$window',
  function ($scope, $http) {
    "use strict";
    $scope.options = {
      url: url,
      maxChunkSize: chunkSize,
      sequentialUploads: true,
      autoUpload: false,
      formData: getFormData,
      chunkdone: chunkDone,
      submit: uploadSubmit,
      done: uploadDone,
      fail: uploadFail
    };
    $scope.loadingFiles = false;
    //$http.get(url)
    //    .then(
    //    function (response) {
    //      $scope.loadingFiles = false;
    //      $scope.queue = response.data.files || [];
    //    },
    //    function () {
    //      $scope.loadingFiles = false;
    //    }
    //);
  }
])

.controller('RefineryFileDestroyController', [
  '$scope', '$http',
  function ($scope, $http) {
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
]);

var url = '/data_set_manager/import/chunked-upload/',
    chunkSize = 10 * 1000 * 1000,  // 1MB
    md5 = {},
    formData = [];  //TODO: add CSRF token to formData?

function calculate_md5(file, chunk_size) {
  "use strict";
  var slice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice,
      chunks = Math.ceil(file.size / chunk_size),
      current_chunk = 0,
      spark = new SparkMD5.ArrayBuffer();
  function onload(e) {
    spark.append(e.target.result);  // append chunk
    current_chunk++;
    if (current_chunk < chunks) {
      read_next_chunk();
    } else {
      md5[file.name] = spark.end();
    }
  }
  function read_next_chunk() {
    var reader = new FileReader();
    reader.onload = onload;
    var start = current_chunk * chunk_size,
        end = Math.min(start + chunk_size, file.size);
    reader.readAsArrayBuffer(slice.call(file, start, end));
  }
  read_next_chunk();
}

var getFormData = function(form) {
  "use strict";
  return formData;
};

var chunkDone = function(e, data) {
  "use strict";
  if (formData < 2) {
    formData.push({"name": "upload_id", "value": data.result.upload_id});
  }
};

var uploadAdd = function(e, data) {
  "use strict";
  console.log("Adding file ", data.files[0]);
  //var that = angular.element(this);
  //console.log("autoUpload", that.fileupload('option', 'autoUpload'));
  //console.log("scope", that.fileupload('option', 'scope'));
  //$.blueimp.fileupload.prototype.options.add.call(that, e, data);
  //data.submit();
};

var uploadSubmit = function(e, data) {
  "use strict";
  console.log("Starting to calculate md5 for:", data.files[0].name);
  calculate_md5(data.files[0], chunkSize);
};

var uploadDone = function(e, data) {
  "use strict";
  console.log("Finished uploading chunks for:", data.files[0].name,
      "md5 =", md5[data.files[0].name]);
  $.ajax({
    type: "POST",
    url: "/data_set_manager/import/chunked-upload-complete/",
    data: {
        upload_id: data.result.upload_id,
        md5: md5[data.files[0].name]
    },
    dataType: "json",
    success: function(data) {
      console.log(data);
    }
  });
  formData = [];  // clear upload_id for the next upload
};

var uploadFail = function(e, data) {
  "use strict";
  console.log(data.errorThrown);
  console.log(data.textStatus);
  console.log(md5);
};
