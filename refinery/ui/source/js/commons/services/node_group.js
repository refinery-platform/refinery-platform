'use strict';

angular
  .module('refineryApp')
  .factory('nodeGroupService', ['$resource', 'settings',
    function ($resource, settings) {
      var nodeGroup = $resource(
        settings.appRoot + settings.refineryApiV2 + '/node_groups/',
        {},
        {
          /* get: get a node groups:
                @params: uuid (req)
                type: string, uuid
          */
          get: {
            method: 'GET',
            params: {
              uuid: 'uuid'
            }
          },
          /* query: get a list of  node groups:
                @params: assay (req)
                type: string, uuid
          */
          query: {
            method: 'GET',
            isArray: true,
            params: {
              assay: 'assay'
            }
          },
          /* update: update an exisiting node group:
                @params: uuid (req)
                type: string, uuid
                @params: nodes
                type: string list, uuids
                @params: is_current
                type: boolen
                @params: use_complement_nodes
                type: boolen
          */
          update: {
            method: 'PUT'
          },
          /* save: Create a new node group:
                @params: name (req)
                type: string
                @params: assay (req)
                type: string, uuid
                @params: study (req)
                type: string, uuid
                @params: nodes
                type: string list, uuids
                @params: is_current
                type: boolen
                @params: use_complement_nodes
                type: boolen
           */
          save: {
            method: 'POST'
          }
        }
      );
      return nodeGroup;
    }
  ]);
