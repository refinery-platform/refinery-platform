
console.log("contents.workflow called");

function getColumnNames( fields ) {
	console.log("getColumnNames called");
	console.log(fields);
	
	var s = '<thead><tr>';
	for ( field in fields ) {
		if ( fields.hasOwnProperty( field ) ) {
			console.log(entry);	
			s += "<th>";
			s += prettifyFieldName(field, true);
			s += "</th>";
		}		
	}
	s+='</tr></thead>'
	console.log(s);
	return s;
}

function prettifyFieldName( name, isTitle )
{	
	isTitle = isTitle || false;
	
	var position = name.indexOf( "_Characteristics_s" );
	if ( position != -1 ) {
		name = name.substr( 0, position );
	}	

	var position = name.indexOf( "_Factor_s" );
	if ( position != -1 ) {
		name.substr( 0, position );
	}
	

	var position = name.indexOf( "_Comment_s" );
	if ( position != -1 ) {
		name.substr( 0, position );
	}

	name = name.replace( /\_/g, " " );
	
	if ( isTitle )
	{
		name = name.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	}

	return name;	
}