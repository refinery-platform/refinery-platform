/*
 * solr_response.js
 *
 * Author: Nils Gehlenborg
 * Created: 30 January 2013
 *
 * Provides a class to store components of a Refinery Solr response.
 */


/*
 * Dependencies:
 */

SolrResponse = function( query ) {

  	var self = this;

	// data structures parsed from response
	self._facetCounts = {};
	self._pivotCounts = {};
	self._fieldList = [];
	self._documentList = [];

	self._query = query;
};


SolrResponse.prototype.initialize = function ( response ) {

	var self = this;

	self._facetCounts = self._processFacetCounts( response );
	self._pivotCounts = self._processPivotCounts( response );
	self._fieldList = self._processFieldList( response );
	self._documentList = self._processDocumentList( response );

	return self;
}


SolrResponse.prototype.getFacetCounts = function() {
	return this._facetCounts;
}


SolrResponse.prototype.getPivotCounts = function() {
	return this._pivotCounts;
}


SolrResponse.prototype.getFieldList = function() {
	return this._fieldList;
}


SolrResponse.prototype.getDocumentList = function() {
	return this._documentList;
}


SolrResponse.prototype._processFacetCounts = function ( response ) {

	var self = this;

	var facetCounts = {};
	if (response.facet_counts) {
		for (var facet in response.facet_counts.facet_fields) {
			if (response.facet_counts.facet_fields.hasOwnProperty(facet)) {

				if (!facetCounts.hasOwnProperty[facet]) {
					facetCounts[facet] = {};
				}

				for (var j = 0; j < response.facet_counts.facet_fields[facet].length; j += 2) {
					var facetValue = response.facet_counts.facet_fields[facet][j];
					var facetValueCount = response.facet_counts.facet_fields[facet][j + 1];

					if (( facetValue === "" ) || ( facetValue === undefined )) {
						facetValue = "undefined";
					}

					facetCounts[facet][facetValue] = facetValueCount;
				}
			}
		}
	}

    return facetCounts;
}


SolrResponse.prototype._processFieldList = function ( response ) {
	var self = this;

	var fieldList = [];

	for ( var i = 0; i < response.response.docs.length; ++i ) {
		var document = response.response.docs[i];

		for ( var field in document ) {
			if ( document.hasOwnProperty( field ) ) {
				fieldList.push( field );
			}
		}

		// TODO: if all documents should be processed change this to get union of all fields
		break;
	}

	return fieldList;
}


SolrResponse.prototype._processDocumentList = function ( response ) {
	var self = this;

	var documentList = [];

	for ( var i = 0; i < response.response.docs.length; ++i ) {
		documentList.push( response.response.docs[i] );
    }

    return documentList;
}


SolrResponse.prototype._processPivotCounts = function ( response ) {
	if (response.facet_counts) {
		return response.facet_counts.facet_pivot;
	}
	else {
		// Return the default value for response.facet_counts
		return {}
	}
}
