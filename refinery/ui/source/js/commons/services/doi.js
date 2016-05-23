'use strict';

function DoiWrapper ($q, $resource, settings) {
  this.$q = $q;
  this.$resource = $resource;
  this.settings = settings;
  this.doi = this.$resource(
    this.settings.appRoot + '/doi/:id/',
    {
      id: '@id'
    }
  );
}

DoiWrapper.prototype.get = function (params) {
  if (!params.id) {
    return this.$q.reject('No DOI given.');
  }
  // Replace all forward slashes with dollar signs.
  params.id = this.escape(params.id);
  return this.doi.get(params);
};

DoiWrapper.prototype.query = function (params) {
  return this.get(params);
};

DoiWrapper.prototype.escape = function (doi) {
  return doi.replace(/\//g, '$');
};

Object.defineProperty(
  DoiWrapper.prototype,
  'doi', {
    enumerable: true,
    configurable: false,
    writable: true
  });

angular
  .module('refineryApp')
  .service('doiService', ['$q', '$resource', 'settings', DoiWrapper]);
