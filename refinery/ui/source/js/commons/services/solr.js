angular
  .module('refineryApp')
  .factory('solrService', ['$resource', 'settings',
    function ($resource, settings) {

      var query = $resource(
        settings.appRoot + settings.solrApi + '/:index/select',
        {
          index: '@index',
          wt: 'json'
        },
        {
          query: {
            method: 'GET',
            isArray: false,
          }
        }
      );

      var prettifyFieldName = function( name, isTitle ) {
        isTitle = isTitle || false;

        var position;

        position = name.indexOf( "_Characteristics_" );
        if ( position !== -1 ) {
          name = name.substr( 0, position );
        }

        position = name.indexOf( "_Factor_" );
        if ( position !== -1 ) {
          name = name.substr( 0, position );
        }

        position = name.indexOf( "_Comment_" );
        if ( position !== -1 ) {
          name = name.substr( 0, position );
        }

        position = name.indexOf( "Material_Type_" );
        if ( position !== -1 ) {
          name = "Material Type";
        }

        position = name.indexOf( "Label_" );
        if ( position !== -1 ) {
          name = "Label";
        }

        position = name.indexOf( "REFINERY_TYPE_" );
        if ( position === 0 ) {
          name = "Type";
        }

        position = name.indexOf( "REFINERY_FILETYPE_" );
        if ( position === 0 ) {
          name = "File Type";
        }

        position = name.indexOf( "REFINERY_NAME_" );
        if ( position === 0 ) {
          name = "Name";
        }

        position = name.indexOf( "REFINERY_ANALYSIS_UUID_" );
        if ( position === 0 ) {
          name = "Analysis";
        }

        position = name.indexOf( "REFINERY_SUBANALYSIS_" );
        if ( position === 0 ) {
          name = "Analysis Group";
        }

        position = name.indexOf( "REFINERY_WORKFLOW_OUTPUT_" );
        if ( position === 0 ) {
          name = "Output Type";
        }

        name = name.replace( /\_/g, " " );

        if ( isTitle ) {
          name = name.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
        }

        return name;
      };

      query.extra = {
        prettifyFieldName: prettifyFieldName
      };

      return query;
    }
  ]);
