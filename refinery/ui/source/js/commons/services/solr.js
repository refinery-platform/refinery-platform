'use strict';

angular
  .module('refineryApp')
  .factory('solrService', ['$resource', 'settings',
    function ($resource, settings) {
      var query = $resource(
        settings.appRoot + settings.solrApi + '/:index/select/',
        {
          index: '@index',
          wt: 'json'
        },
        {
          query: {
            method: 'GET',
            isArray: false
          }
        }
      );

      var prettifyFieldName = function (name, isTitle) {
        var position;
        var newName = name;

        position = newName.indexOf('_Characteristics_');
        if (position !== -1) {
          newName = newName.substr(0, position);
        }

        position = newName.indexOf('_Factor_');
        if (position !== -1) {
          newName = newName.substr(0, position);
        }

        position = newName.indexOf('_Comment_');
        if (position !== -1) {
          newName = newName.substr(0, position);
        }

        position = newName.indexOf('Material_Type_');
        if (position !== -1) {
          newName = 'Material Type';
        }

        position = newName.indexOf('Label_');
        if (position !== -1) {
          newName = 'Label';
        }

        position = newName.indexOf('REFINERY_TYPE_');
        if (position === 0) {
          newName = 'Type';
        }

        position = newName.indexOf('REFINERY_FILETYPE_');
        if (position === 0) {
          newName = 'File Type';
        }

        position = newName.indexOf('REFINERY_NAME_');
        if (position === 0) {
          newName = 'Name';
        }

        position = newName.indexOf('REFINERY_ANALYSIS_UUID_');
        if (position === 0) {
          newName = 'Analysis';
        }

        position = newName.indexOf('REFINERY_SUBANALYSIS_');
        if (position === 0) {
          newName = 'Analysis Group';
        }

        position = newName.indexOf('REFINERY_WORKFLOW_OUTPUT_');
        if (position === 0) {
          newName = 'Output Type';
        }

        newName = newName.replace(/\_/g, ' ');

        if (isTitle) {
          newName = newName.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
          });
        }

        return newName;
      };

      query.extra = {
        prettifyFieldName: prettifyFieldName
      };

      return query;
    }
  ]);
