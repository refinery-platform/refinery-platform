'use strict';

function MetadataTableImportCtrl (
  $log,
  $rootScope,
  $timeout,
  $window,
  d3,
  $uibModal,
  fileSources,
  settings,
  tabularFileImportApi,
  metadataStatusService
) {
  this.$log = $log;
  this.$rootScope = $rootScope;
  this.$timeout = $timeout;
  this.$window = $window;
  this.d3 = d3;
  this.$uibModal = $uibModal;
  this.fileSources = fileSources;
  this.settings = settings;
  this.showFileUpload = false;
  this.tabularFileImportApi = tabularFileImportApi;
  this.metadataStatusService = metadataStatusService;
  this.whiteSpaceStripFlag = false;

  this.gridOptions = {
    resizeable: true
  };
  this.badFileList = [];
  this.dataFileColumn = null;

  this.separator = 'tab';
  this.customSeparator = null;
  // This is only false when `this.separator` is `custom` but
  // `this.customSeparator` is an empty String.
  this.isSeparatorOk = true;
  this.setParser();

  // Helper method to exit out of error alert
  this.closeError = function () {
    this.isErrored = false;
  };
}

Object.defineProperty(
  MetadataTableImportCtrl.prototype,
  'file', {
    enumerable: true,
    get: function () {
      return this._file;
    },
    set: function (value) {
      this._file = value;
      this.setImportOption(value);

      if (value) {
        this.renderTable();
      } else {
        this.clearTable();
      }
    }
  }
);

MetadataTableImportCtrl.prototype.setImportOption = function (value) {
  if (value) {
    this.importOption = 'tabularFile';
  } else {
    this.importOption = undefined;
  }
};

MetadataTableImportCtrl.prototype.clearFile = function () {
  // Set preview flag so ui won't trigger alert when navigating away.
  this.metadataStatusService.setMetadataPreviewStatus(false);
  this.$rootScope.$broadcast('clearFileInput', 'metadataTable');
};

MetadataTableImportCtrl.prototype.clearTable = function () {
  this.metadataSample = [];
  this.metadataHeader = [];
  this.columnDefs = [];
};

MetadataTableImportCtrl.prototype.setParser = function () {
  var self = this;

  switch (self.separator) {
    case 'tab':
      self.parser = self.d3.tsv.parse;
      self.isSeparatorOk = true;
      break;
    case 'custom':
      if (self.customSeparator) {
        self.parser = self.d3.dsv(self.customSeparator, 'text/plain').parse;
        self.isSeparatorOk = true;
      } else {
        self.isSeparatorOk = false;
      }
      break;
    default:
      // Comma separation is assumed by default.
      self.parser = self.d3.csv.parse;
      self.isSeparatorOk = true;
      break;
  }
};

MetadataTableImportCtrl.prototype.renderTable = function () {
  var self = this;

  // Set title to uploaded file name minus extension by default
  self.title = self.file.name.replace(/\.[^/.]+$/, '');

  var reader = new FileReader();
  reader.onload = function (event) {
    self.whiteSpaceStripFlag = false;

    self.$rootScope.$apply(function () {
      // split on newline
      var dataArr = event.target.result.split(/\r\n|\r|\n/g);

      // remove any white spaces before/after each row
      for (var i = 0; i < dataArr.length; i++) {
        var trimmedDataArr = dataArr[i].trim();
        // Flag for ui to display strip warning.
        if (!self.whiteSpaceStripFlag && trimmedDataArr !== dataArr[i]) {
          self.whiteSpaceStripFlag = true;
        }
        dataArr[i] = trimmedDataArr;
      }
      // rejoin rows with new line
      var fileStr = dataArr.join('\r\n');
      /* Create a new file with the modified data and the originial file props.
      * Safari supports File API Constructor but has issues with appending the
      * file. Symptoms show up with content-type errors and file size 0 on
      * back end. userAgent contains browser info
      * */
      if (self.$window.navigator.userAgent.indexOf('Safari') > -1) {
        self.strippedFile = new Blob([fileStr], { type: 'application/json' });
      } else if (typeof self.$window.File === 'function') {
        self.strippedFile = new File([fileStr], self.file.name, self.file);
      } else {
        self.strippedFile = new Blob([fileStr], { type: 'application/json' });
      }

      self.metadata = self.parser(fileStr);
      // Get 5 lines to display on screen
      self.metadataSample = self.metadata.slice(0, 5);
      self.metadataHeader = Object.keys(self.metadataSample[0]);
      self.sourceColumnIndex = [self.metadataHeader[0]];

      // Preselects column to match sample of tabular metadata.
      if (self.metadataHeader.length > 2) {
        self.dataFileColumn = self.metadataHeader[1];
        self.speciesColumn = self.metadataHeader[2];
      } else if (self.metadataHeader.length > 1) {
        self.dataFileColumn = self.metadataHeader[1];
        self.speciesColumn = self.metadataHeader[1];
      } else {
        self.dataFileColumn = self.metadataHeader[0];
        self.speciesColumn = self.metadataHeader[0];
      }
      self.gridOptions.columnDefs = self.makeColumnDefs();

      // Since we are using the _controller as_ syntax we have to update the
      // _data_ property of _gridOptions_ here explicitely instead of specifying
      // the _data_ property via a string in _gridOptions_.
      self.gridOptions.data = self.metadataSample;
    });
  };
  // Set preview flag so ui can trigger alert when navigating away.
  this.metadataStatusService.setMetadataPreviewStatus(true);
  reader.readAsText(self.file);
};

MetadataTableImportCtrl.prototype.makeColumnDefs = function () {
  var self = this;

  // Calculate column widths according to each column header length.
  var totalChars = self.metadataHeader.reduce(
    function (previousValue, currentValue) {
      return previousValue + String(currentValue).length;
    }, 0
  );

  var columnDefs = [];

  self.metadataHeader.forEach(function (element) {
    var columnName = String(element);
    var columnWidth = columnName.length / totalChars * 100;
    if (columnWidth < 10) {  // make sure columns are wide enough
      columnWidth = Math.round(columnWidth * 2);
    }
    columnDefs.push({
      field: columnName,
      width: columnWidth + '%',
      displayName: columnName
    });
  });
  return columnDefs;
};

MetadataTableImportCtrl.prototype.checkFiles = function () {
  var self = this;

  // check if the files listed in the dataFileColumn exist on the server
  var fileData = {
    base_path: self.basePath,
    list: []
  };

  // get the list of file references
  if (self.dataFileColumn) {
    self.metadata.forEach(function (row) {
      fileData.list.push(row[self.dataFileColumn]);
    });
  }

  // collect Cognito identity ID if deployed on AWS and credentials are available
  if (this.settings.djangoApp.deploymentPlatform === 'aws' && AWS.config.credentials !== null) {
    fileData.identity_id = AWS.config.credentials.identityId;
  }

  self.fileSources
    .check({}, fileData)
    .$promise
    .then(function (response) {
      var checkFilesDialogConfig;

      if (response.length > 0) {
        checkFilesDialogConfig = {
          title: 'The following files were not found on the server:',
          items: response
        };
      } else {
        checkFilesDialogConfig = {
          title: 'All files were found on the server',
          items: response
        };
      }

      self.$uibModal.open({
        templateUrl: function () {
          return self.$window.getStaticUrl(
            'partials/data-set-import/partials/dialog-list-confirmation.html'
          );
        },
        controller: 'ConfirmationDialogInstanceCtrl as modal',
        size: 'lg',
        resolve: {
          config: function () {
            return checkFilesDialogConfig;
          }
        }
      });
    })
    .catch(function (response, status) {
      var errorMsg = 'Request failed: error ' + status;
      self.$log.error(errorMsg);
    });
};

MetadataTableImportCtrl.prototype.startImport = function () {
  var self = this;

  self.isImporting = true;

  var formData = new FormData();
  if (self.file) {
    formData.append('file', self.strippedFile);
  }
  if (self.title) {
    formData.append('title', self.title);
  }
  for (var i = 0; i < self.sourceColumnIndex.length; i++) {
    // from select menu, need to grab index of sourceColumnIndex
    var sourceIndex = self.metadataHeader.indexOf(self.sourceColumnIndex[i]);
    formData.append(
      'source_column_index', sourceIndex
    );
  }
  if (self.dataFileColumn) {
    // from select menu, need to grab index of dataFileColumn
    var fieldIndex = self.metadataHeader.indexOf(self.dataFileColumn);
    formData.append('data_file_column', fieldIndex);
  }
  switch (self.separator) {
    case 'tab':
      formData.append('delimiter', 'tab');
      break;
    case 'custom':
      formData.append('delimiter', 'custom');
      formData.append('custom_delimiter_string', self.customSeparator);
      break;
    default:
      formData.append('delimiter', 'comma');
      break;
  }

  if (self.auxFileColumn) {
    formData.append('aux_file_column', self.auxFileColumn);
  }
  if (self.speciesColumn) {
    formData.append('species_column', self.speciesColumn);
  }
  if (self.annotationColumn) {
    formData.append('annotation_column', self.annotationColumn);
  }
  if (self.genomeBuildColumn) {
    formData.append('genome_build_column', self.genomeBuildColumn);
  }
  if (self.dataFilePermanent) {
    formData.append('data_file_permanent', self.dataFilePermanent);
  }
  // collect Cognito identity ID if deployed on AWS and credentials are available
  if (this.settings.djangoApp.deploymentPlatform === 'aws' && AWS.config.credentials !== null) {
    formData.append('identity_id', AWS.config.credentials.identityId);
  }

  return this.tabularFileImportApi
    .create({}, formData)
    .$promise
    .then(function (response) {
      self.importedDataSetUuid = response.new_data_set_uuid;
      self.isSuccessfullyImported = true;
      // Set preview flag so ui won't trigger alert when navigating away.
      self.metadataStatusService.setMetadataPreviewStatus(false);
      self.$timeout(function () {
        self.$window.location.href = '/data_sets/' + self.importedDataSetUuid;
      }, 2500);
    })
    .catch(function (error) {
      self.isErrored = true;
      self.$log.error(error);
    })
    .finally(function () {
      self.isImporting = false;
    });
};

angular
  .module('refineryDataSetImport')
  .controller('MetadataTableImportCtrl', [
    '$log',
    '$rootScope',
    '$timeout',
    '$window',
    'd3',
    '$uibModal',
    'fileSources',
    'settings',
    'tabularFileImportApi',
    'metadataStatusService',
    MetadataTableImportCtrl
  ]);
