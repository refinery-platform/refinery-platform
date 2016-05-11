'use strict';

function RefineryImportCtrl () {}

Object.defineProperty(
  RefineryImportCtrl.prototype,
  'isDisabledTabularImport', {
    enumerable: true,
    get: function () {
      return this.option === 'isaTab';
    }
  }
);

Object.defineProperty(
  RefineryImportCtrl.prototype,
  'isDisabledIsaTabImport', {
    enumerable: true,
    get: function () {
      return this.option === 'tabular';
    }
  }
);

angular
  .module('refineryDataSetImport')
  .controller('RefineryImportCtrl', [
    RefineryImportCtrl
  ]);
