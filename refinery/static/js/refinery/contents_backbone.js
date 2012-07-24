// Nils Gehlenborg, July 2012

// Load the application once the DOM is ready, using `jQuery.ready`:
$(function(){
	/*
Backbone.sync = function(method, model, options) {

  var resp;

  switch (method) {
    case "read":    resp = model.id ? store.find(model) : store.findAll(); break;
    case "create":  resp = store.create(model);                            break;
    case "update":  resp = store.update(model);                            break;
    case "delete":  resp = store.destroy(model);                           break;
  }

  if (resp) {
    options.success(resp);
  } else {
    options.error("Record not found");
  }
};	
*/
  // Todo Model
  // ----------

  var FacetValue = Backbone.Model.extend({

    // Default attributes for the facet item.
    defaults: function() {
      return {
      	name: "",
      	count: 0,
      	selected: false,
      };
    },

    initialize: function() {
      //this.save({name: "testfacet", count: 0, selected: false });
      
 	  $.ajaxPrefilter( function( options, originalOptions, jqXHR ) {
        options.xhrFields = { withCredentials: true }; 
        });
    },

    // Toggle the `done` state of this facet value item.
   toggle: function() {
      //this.save({selected: !this.get("selected")});
      console.log( "Toggled!");
    },
  });

  // Facet - a collection of facet values
  // ------------------------------------

  var Facet = Backbone.Collection.extend({

 	initialize: function(models, options) {
 		this.options = options;
        
 	  $.ajaxPrefilter( function( options, originalOptions, jqXHR ) {
        options.xhrFields = { withCredentials: true }; 
        });
        
    },

    // Reference to this collection's model.
    model: FacetValue,    
        
    url: function() {
    	study_uuid = this.options.study_uuid;
    	assay_uuid = this.options.assay_uuid;
    	type = this.options.type;
    	filter = "fq=(study_uuid:" + study_uuid + " AND assay_uuid:" + assay_uuid + " AND type:" + type + ")";
    	
    	name = this.options.name;    	
    	facet = "facet.field=" + name;
    	
    	url = "http://127.0.0.1:8983/solr/data_set_manager/select?q=django_ct:data_set_manager.node&facet.mincount=1&wt=json&facet=true&" + filter + "&" + facet;
    	
    	console.log( "Query URL: " + url );
    	
    	return url;
    },
    
    parse: function( response ) {
    	
    	console.log( response) 
    	var result = response.facet_counts.facet_fields[this.options.name];    	
    	var resultList = [];
    	
    	for ( i = 0; i < result.length; i += 2 ) {
    		console.log( { name: result[i], count: result[i+1], selected: false } );
    		resultList.push( { name: result[i], count: result[i+1], selected: false } );	
    	}    	
    	
    	return resultList;
    },
  });

  // Create our global collection of **Todos**.
  //var Facet = new Facet({}, { name: "Organism_Characteristics_s", type: "\"Raw Data File\"", study_uuid: "0a6fa985-d2bb-11e1-b64f-c8bcc8ed32d3", assay_uuid: "0aadbc0f-d2bb-11e1-9652-c8bcc8ed32d3" } );
  var Facet = new Facet({}, { name: "antibody_Characteristics_s", type: "\"Raw Data File\"", study_uuid: "0a6fa985-d2bb-11e1-b64f-c8bcc8ed32d3", assay_uuid: "0aadbc0f-d2bb-11e1-9652-c8bcc8ed32d3" } );


  // The DOM element for a facet value item...
  var FacetValueView = Backbone.View.extend({

    //... is a list tag.
    tagName: "li",

    // Cache the template function for a single item.
    template: _.template($('#facet-template').html() ),

    // Re-render the titles of the todo item.
    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },

    toggleSelected: function() {
      this.model.toggle();
    },

    // Remove the item, destroy the model.
    clear: function() {
      this.model.clear();
    }

  });

  // The Application
  // ---------------

  // Our overall **AppView** is the top-level piece of UI.
  var FacetView = Backbone.View.extend({

    // Instead of generating a new element, bind to the existing skeleton of
    // the App already present in the HTML.
    el: $("#facetview"),

    // At initialization we bind to the relevant events on the `Todos`
    // collection, when items are added or changed. Kick things off by
    // loading any preexisting todos that might be saved in *localStorage*.
    initialize: function() {
      Facet.on('add', this.addOne, this);
      Facet.on('reset', this.addAll, this);
      Facet.on('all', this.render, this);
      
      console.log( Facet )

      //Facet.fetch( { data: $.param( { withCredentials: true } ) } );
      Facet.fetch();
    },

    // Add a single todo item to the list by creating a view for it, and
    // appending its element to the `<ul>`.
    addOne: function(facetValue) {
      var view = new FacetValueView({model: facetValue});
      this.$("#facet").append(view.render().el);
    },

    // Add all items in the **Todos** collection at once.
    addAll: function() {
      Facet.each(this.addOne);
    },
  });

  // Finally, we kick things off by creating the **App**.
  var App = new FacetView;

});