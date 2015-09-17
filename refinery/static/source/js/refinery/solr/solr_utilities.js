/*
 * @author: Nils Gehlenborg
 *
 * Utility functions for dealing with Solr queries and results.
 */

NODE_INDEX_TYPE_PREFIX = "REFINERY_TYPE"
NODE_INDEX_NAME_PREFIX = "REFINERY_NAME"
NODE_INDEX_WORKFLOW_OUTPUT_PREFIX = "REFINERY_WORKFLOW_OUTPUT"
NODE_INDEX_ANALYSIS_UUID_PREFIX = "REFINERY_ANALYSIS_UUID"
NODE_INDEX_SUBANALYSIS_PREFIX = "REFINERY_SUBANALYSIS"
NODE_INDEX_FILETYPE_PREFIX = "REFINERY_FILETYPE"

REQUIRED_FACET_PREFIXES = [ NODE_INDEX_ANALYSIS_UUID_PREFIX, NODE_INDEX_SUBANALYSIS_PREFIX, NODE_INDEX_WORKFLOW_OUTPUT_PREFIX ];


//===================================================================
// prototypical inheritance framework from http://javascript.info/
//===================================================================
function extend(Child, Parent) {
  Child.prototype = inherit(Parent.prototype)
  Child.prototype.constructor = Child
  Child.parent = Parent.prototype
}

function inherit(proto) {
  function F() {}
  F.prototype = proto
  return new F
}

function composeFieldNameId( fieldName ) {
	return ( "fieldname" + "___" + fieldName );
}

function decomposeFieldNameId( fieldNameId ) {
	return ( { fieldName: fieldNameId.split( "___" )[1] } );
}


function composeFacetValueId( facet, facetValue ) {
	return ( "facetvalue" + "___" + facet + "___" + facetValue );
}

function decomposeFacetValueId( facetValueId ) {
	return ( { facet: facetValueId.split( "___" )[1], facetValue: facetValueId.split( "___" )[2] } );
}

function composeFacetId( facet ) {
	return ( "facet" + "___" + facet );
}


function prettifySolrFieldName( name, isTitle )
{
	isTitle = isTitle || false;

	var position = name.indexOf( "_Characteristics_" );
	if ( position != -1 ) {
		name = name.substr( 0, position );
	}

	var position = name.indexOf( "_Factor_" );
	if ( position != -1 ) {
		name = name.substr( 0, position );
	}

	var position = name.indexOf( "_Comment_" );
	if ( position != -1 ) {
		name = name.substr( 0, position );
	}

	var position = name.indexOf( "Material_Type_" );
	if ( position != -1 ) {
		name = "Material Type";
	}

	var position = name.indexOf( "Label_" );
	if ( position != -1 ) {
		name = "Label";
	}

	var position = name.indexOf( "REFINERY_TYPE_" );
	if ( position == 0 ) {
		name = "Type";
	}

	var position = name.indexOf( "REFINERY_FILETYPE_" );
	if ( position == 0 ) {
		name = "File Type";
	}

	var position = name.indexOf( "REFINERY_NAME_" );
	if ( position == 0 ) {
		name = "Name";
	}

	var position = name.indexOf( "REFINERY_ANALYSIS_UUID_" );
	if ( position == 0 ) {
		name = "Analysis";
	}

	var position = name.indexOf( "REFINERY_SUBANALYSIS_" );
	if ( position == 0 ) {
		name = "Analysis Group";
	}

	var position = name.indexOf( "REFINERY_WORKFLOW_OUTPUT_" );
	if ( position == 0 ) {
		name = "Output Type";
	}



	name = name.replace( /\_/g, " " );

	if ( isTitle )
	{
		name = name.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	}

	return name;
}


function isRequiredFacet( facet ) {
	// test if this field should be skipped
	for ( var p = 0; p < REQUIRED_FACET_PREFIXES.length; ++p ) {
		if ( facet.indexOf( REQUIRED_FACET_PREFIXES[p] ) == 0 ) {
			return true;
		}
	}

	return false;
}

