(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .controller('IsaTabImportCtrl', IsaTabImportCtrl);

  IsaTabImportCtrl.$inject = [
    '$log', '$rootScope', '$timeout', '$window', '$location', 'isaTabImportApi', 'settings'
  ];

  function IsaTabImportCtrl ($log, $rootScope, $timeout, $window, $location,
                             isaTabImportApi, settings) {
    this.$log = $log;
    this.$rootScope = $rootScope;
    this.$timeout = $timeout;
    this.$window = $window;
    this.isaTabImportApi = isaTabImportApi;
    this.settings = settings;
    this.showFileUpload = false;
    this.dataSetUUID = $location.search().dataSetUUID;
    this.isMetaDataRevision = !!this.dataSetUUID;

    // Helper method to exit out of error alert
    this.closeError = function () {
      this.isErrored = false;
    };
  }

  Object.defineProperty(
    IsaTabImportCtrl.prototype,
    'file', {
      enumerable: true,
      get: function () {
        return this._file;
      },
      set: function (value) {
        this._file = value;
        this.setImportOption(value);
      }
    }
  );

  Object.defineProperty(
    IsaTabImportCtrl.prototype,
    'urlToFile', {
      enumerable: true,
      get: function () {
        return this._urlToFile;
      },
      set: function (value) {
        this._urlToFile = value;
        this.setImportOption(value);
      }
    }
  );

  IsaTabImportCtrl.prototype.setImportOption = function (value) {
    if (value) {
      this.importOption = 'isaTab';
    } else {
      this.importOption = undefined;
    }
  };

  IsaTabImportCtrl.prototype.checkImportOption = function () {
    return !this.importOption || this.importOption === 'isaTab';
  };

  IsaTabImportCtrl.prototype.clearFile = function () {
    this.$rootScope.$broadcast('clearFileInput', 'isaTabFile');
  };

  IsaTabImportCtrl.prototype.startImport = function () {
    var self = this;
    this.isImporting = true;

    var formData = new FormData();
    formData.append('isa_tab_file', this.file);
    formData.append('isa_tab_url', this.urlToFile);

    // collect Cognito identity ID if deployed on AWS and credentials are available
    if (this.settings.djangoApp.deploymentPlatform === 'aws' && AWS.config.credentials !== null) {
      formData.append('identity_id', AWS.config.credentials.identityId);
    }

    var queryParams = {};
    if (this.isMetaDataRevision) {
      queryParams = { data_set_uuid: this.dataSetUUID };
    }
    return this.isaTabImportApi
      .create(queryParams, formData)
      .$promise
      .then(function (response) {
        self.importedDataSetUuid = response.data.new_data_set_uuid;
        self.isSuccessfullyImported = true;
        self.$timeout(function () {
          self.$window.location.href = '/data_sets/' + self.importedDataSetUuid;
        }, 2500);
      })
      .catch(function (error) {
        self.isErrored = true;
        self.errorMessage = error.data;
        self.$log.error(error);
      })
      .finally(function () {
        self.isImporting = false;
      });
  };
})();
