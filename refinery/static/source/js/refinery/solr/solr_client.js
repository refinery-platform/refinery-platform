/*
 * solr_client.js
 *  
 * Author: Nils Gehlenborg 
 * Created: 28 January 2013
 *
 * A simple Solr client that retrieves data based on a SolrQuery object. The client
 * provides the Solr instance information (base URL, ports, etc.) whereas the query
 * provides everything else. 
 */


/*
 * Dependencies:
 * - SolrQuery
 */
SOLR_ERROR_TRIGGER = 0;
SOLR_QUERY_INITIALIZED_COMMAND = 'solr_query_initialized';
SOLR_QUERY_UPDATED_COMMAND = 'solr_query_updated';
SolrClient = function( apiBaseUrl, apiEndpoint, crsfMiddlewareToken, baseQuery, baseFilter, commands ) {
  	var self = this;

  	// API related properties
  	self._apiBaseUrl = apiBaseUrl;
  	self._apiEndpoint = apiEndpoint;
  	self._crsfMiddlewareToken = crsfMiddlewareToken;

  	self._baseQuery = baseQuery; // e.g. "q=django_ct:data_set_manager.node";
  	self._baseFilter = baseFilter; // e.g. "fq=(study_uuid:<some id> AND assay_uuid:<someotherid> AND ...)"
	self._baseSettings = "wt=json&json.wrf=?";

	// wreqr commands
	self._commands = commands;
};

SolrClient.prototype._createBaseUrl = function( documentIndex, documentCount ) {

	var self = this;

	var url = self._apiBaseUrl + self._apiEndpoint
		+ "?" + "q=" + self._baseQuery
		+ "&" + self._baseSettings
		+ "&" + "start=" + documentIndex
		+ "&" + "rows=" + documentCount
		+ "&" + "fq=" + self._baseFilter;

	return url;
}


/*
 * Initializes a DataSetSolrQuery: retrieves field names, facets, etc.
 */
SolrClient.prototype.initialize = function ( query, resetQuery, callback ) {

	var self = this;
	var url = self._createBaseUrl( query.getDocumentIndex(), query.getDocumentIndex() + 1 ) + query.create( SOLR_FILTER_QUERY );

	$.ajax( { type: "GET", dataType: "jsonp", url: url,

		statusCode: {
        500: function() {

			SOLR_ERROR_TRIGGER += 1;
			if (SOLR_ERROR_TRIGGER > 1){
				bootbox.alert(
            	"<h3 style='color:red;'>Error: 500</h3>" +
            	"<p>" +
           	 	"It looks like one or more services are not running." +
            	"</p>" +
				"<p>" +
				"Please contact your " +
				"<a href='mailto:" +
				admins +
				"?Subject=Refinery%20Error' target='_top'>System Administrator</a>" +
				".</p>"
        );
			}

        }
		},

		success: function(data) {

			if (resetQuery) {
				query.initialize();
			}

			query.setTotalDocumentCount(data.response.numFound);
			query.setCurrentDocumentCount(data.response.numFound);

			self._commands.execute(SOLR_QUERY_INITIALIZED_COMMAND, {'query': query});

			if (typeof callback !== 'undefined') {
				callback(query);
			}
		}

	});
};

/*
 * Executes a DataSetSolrQuery: can be a DATA_SET_FULL_QUERY or a DATA_SET_PIVOT_QUERY or any other combination
 */
SolrClient.prototype.run = function ( query, queryComponents, callback ) {

	var self = this;
	var url = self.createUrl( query, queryComponents );

	$.ajax( { type: "GET", dataType: "jsonp", url: url,

		statusCode: {
        500: function() {
			if (SOLR_ERROR_TRIGGER == 0) {

        	bootbox.alert(
            	"<h3 style='color:red;'>Error: 500</h3>" +
            	"<p>" +
           	 	"It looks like one or more services are not running." +
            	"</p>" +
				"<p>" +
				"Please contact your " +
				"<a href='mailto:" +
				admins +
				"?Subject=Refinery%20Error' target='_top'>System Administrator</a>" +
				".</p>"
        );
				SOLR_ERROR_TRIGGER+=1;



			}
        }
    },

		success: function(data) {

			var response = new SolrResponse( query );
			response.initialize( data );

			query.setCurrentDocumentCount( data.response.numFound );

			self._commands.execute( SOLR_QUERY_UPDATED_COMMAND, { 'query': query, 'response': response } );

			if ( typeof callback !== 'undefined' ) {
				callback(response);
			}
		}

	});
};


SolrClient.prototype.createUrl = function( query, queryComponents ) {
	var self = this;
	
	return  self._createBaseUrl( query.getDocumentIndex(), query.getDocumentCount() ) + query.create( queryComponents );		
}

SolrClient.prototype.createUnpaginatedUrl = function( query, queryComponents ) {
	var self = this;

	return  self._createBaseUrl( query.getDocumentIndex(), query.getTotalDocumentCount() ) + query.create( queryComponents );		
}
