/*
 * @author: Nils Gehlenborg
 * 
 * Utility functions for dealing with Solr queries and results.
 */

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

	name = name.replace( /\_/g, " " );
	
	if ( isTitle )
	{
		name = name.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	}

	return name;	
}
