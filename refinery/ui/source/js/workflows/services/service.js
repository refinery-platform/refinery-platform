'use strict';

function workflowService () {
  this.instance = null;

  this.isAvailable = function () {
    return !!this.instance;
  };

  this.get = function () {
    return this.instance;
  };

  this.set = function (instance) {
    this.instance = instance;
  };

  this.isSingleInput = function () {
    if (this.instance && this.getInputSet(2)) {
      return false;
    }
    return true;
  };

  this.getUuid = function () {
    if (this.isAvailable()) {
      return this.instance.uuid;
    }
    return undefined;
  };

  this.getSummary = function () {
    if (this.isAvailable()) {
      return this.instance.summary;
    }
    return undefined;
  };

  this.getName = function () {
    if (this.isAvailable()) {
      return this.instance.name;
    }
    return undefined;
  };

  this.getCategory = function () {
    if (this.isSingleInput()) {
      return 'File Set';
    }
    return this.instance.input_relationships[0].category + ' File Mapping';
  };

  this.getInputSet = function (number) {
    if (this.isAvailable()) {
      switch (number) {
        case 1:
          return this.instance.input_relationships[0].set1;
        case 2:
          return this.instance.input_relationships[0].set2;
        default:
          return undefined;
      }
    }
    return undefined;
  };

  this.getGalaxyInstanceId = function () {
    if (this.isAvailable()) {
      return this.instance.galaxy_instance_identifier;
    }
    return undefined;
  };
}

angular
  .module('refineryWorkflows')
  .service('workflow', [workflowService]);
