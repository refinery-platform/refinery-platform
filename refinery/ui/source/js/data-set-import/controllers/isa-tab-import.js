'use strict';

function IsaTabImportCtrl ($log, isaTabImportApi) {
  this.$log = $log;
  this.isaTabImportApi = isaTabImportApi;
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

IsaTabImportCtrl.prototype.startImport = function () {
  var self = this;

  this.isImporting = true;

  var formData = new FormData();
  formData.append('isa_tab_file', this.file);
  formData.append('isa_tab_url', this.urlToFile);

  return this.isaTabImportApi
    .create({}, formData)
    .$promise
    .then(function (data) {
      self.$log.info('Yeah! Success', data);
    })
    .catch(function (error) {
      self.$log.error(error);
    })
    .finally(function () {
      self.isImporting = false;
    });
};

angular
  .module('refineryDataSetImport')
  .controller('IsaTabImportCtrl', [
    '$log',
    'isaTabImportApi',
    IsaTabImportCtrl
  ]);
