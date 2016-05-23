'use strict';

function PreviewService () {}

Object.defineProperty(
  PreviewService.prototype,
  'dataSet', {
    enumerable: true,
    value: null,
    writable: true
  });

Object.defineProperty(
  PreviewService.prototype,
  'previewing', {
    enumerable: true,
    value: false,
    writable: true
  });

/**
 * Close data set preview view.
 *
 * @method  close
 * @author  Fritz Lekschas
 * @date    2016-05-09
 */
PreviewService.prototype.close = function () {
  if (this.previewing) {
    this.dataSetUuid = undefined;
  }
  this.previewing = false;
};

/**
 * Open data set preview view by UUID
 *
 * @method  preview
 * @author  Fritz Lekschas
 * @date    2016-05-09
 * @param   {String}  dataSetUuid  UUID of the data set to be previewed.
 */
PreviewService.prototype.preview = function (dataSetUuid) {
  // Unset old preview
  if (this.previewing) {
    this.dataSetUuid = undefined;
  }

  // Store data set that's to be previewed
  this.dataSetUuid = dataSetUuid;
  this.previewing = true;
};

function PreviewFactory () {
  return new PreviewService();
}

angular
  .module('refineryDashboard')
  .factory('dashboardDataSetPreviewService', [PreviewFactory]);
