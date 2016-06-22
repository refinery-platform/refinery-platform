'use strict';

angular
  .module('refineryApp')
  .factory('nodeGroupService', ['$resource', 'settings',
    function ($resource, settings) {
      var nodeGroup = $resource(
        settings.appRoot + settings.refineryApiV2 + '/node_group/',
        {},
        {
          query: {
            method: 'GET'
          },
          params: {
            uuid: 'uuid',
            assay: 'assay'
          }
        },
        {
          update: {
            method: 'PUT'
          },
          params: {
            uuid: 'uuid',
            nodes: 'nodes',
            is_current: 'is_current'
          }
        },
        {
          save: {
            method: 'POST'
          },
          params: {
            name: 'name',
            study: 'study',
            assay: 'assay',
            nodes: 'nodes',
            is_current: 'is_current'
          }
        }
      );
      return nodeGroup;
    }
  ]);
