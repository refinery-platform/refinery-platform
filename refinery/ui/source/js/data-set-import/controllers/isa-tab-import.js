'use strict';

function IsaTabImportCtrl ($log, isaTabImportFormService) {
  this.$log = $log;
  this.isaTabImportFormService = isaTabImportFormService;
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

  return this.isaTabImportFormService.save({})
    .$promise
    .then(function () {

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
    'isaTabImportFormService',
    IsaTabImportCtrl
  ]);
