angular.module('refinerySolr', [])


.factory("solrFactory", function($resource, $window) {
  'use strict';

  return $resource(
    '/solr/data_set_manager/select/?q=django_ct\\:data_set_manager.node&wt=json&start=0&rows=20&fq=(uuid::nodeUuid%20AND%20study_uuid::studyUuid%20AND%20assay_uuid::assayUuid)&fq=type:(%22Raw%20Data%20File%22%20OR%20%22Derived%20Data%20File%22%20OR%20%22Array%20Data%20File%22%20OR%20%22Derived%20Array%20Data%20File%22%20OR%20%22Array%20Data%20Matrix%20File%22%20OR%20%22Derived%20Array%20Data%20Matrix%20File%22)&fl=:attributeList', {
      studyUuid: $window.externalStudyUuid,
      assayUuid: $window.externalAssayUuid
    }
  );
})

.service('solrService', function(){

  this.prettifyFieldName = function( name, isTitle )
  { 
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
      name = "Subanalysis";
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
});
