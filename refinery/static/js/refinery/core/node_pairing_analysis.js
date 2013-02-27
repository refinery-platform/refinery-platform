/*
 * node_pairing_analysis.js
 *
 * Author: Richard Park
 * Created: 6 Feb 2012
 *
 * Initial attempt to use backbone + nodeset + nodepair relationships to automatically determine input pairing and to run workflows in galaxy
 */


/*
 * Dependencies:
 * - JQuery
 * - underscore.js
 * - backbone.js
 */


/*
 * Marionette view of creating node pairs from node sets
 *
 */


var nrApp = new Marionette.Application();

nrApp.addRegions({
  p_workflow : '#process_1',
  p_inputs   : '#process_2',
  p_cols : '#process_3'
});

// starts marionette application once tab is opened for the first time
$('#tabs li a[href="#process"]').on('shown', function (e) {
  //$('#tabs li a[href="#process"]').tab('show')
  e.target // activated tab
  e.relatedTarget // previous tab
  //console.log("tab shown");
  //console.log('is started');
  //console.log(nrApp.nrMod.started);
  if (!nrApp.nrMod.started) {
	nrApp.start();
  }
})

//===================================================================
// Registering Ajax commands
//===================================================================

// http://lostechies.com/derickbailey/2012/05/04/wrapping-ajax-in-a-thin-command-framework-for-backbone-apps/
Backbone.AjaxCommands.register("nodesetForm", {
  url: "/analysis_manager/run_nodeset/",
  type: "POST",
  dataType: "JSON",
});

Backbone.AjaxCommands.register("nodeRelationForm", {
  url: "/analysis_manager/run_noderelationship/",
  type: "POST",
  dataType: "JSON",
});

Backbone.AjaxCommands.register("createRelationForm", {
  url: "/analysis_manager/create_noderelationship/",
  type: "POST",
  dataType: "JSON",
});


nrApp.module('nrMod', function(nrMod, App, Backbone, Marionette, $, _){
	//console.log("inside nrMOD Module");
	var nr_wcv;
	var nr_inputs;
	var model_nodeset;
	var model_workflow;
	var model_noderelation;
	var deferreds = [];
	var nodeset_form;
	var node_relation_form;
	nrMod.started = false;
	var view_fields;
	var model_fields;
	var query_fields;
	var tl;
	var create_relation_form;


	//===================================================================
	// Button Actions
	//===================================================================
	nrMod.createRelationship = function(event) {
		console.log("BUTTON: createRelationship called ");

		// Determining which fields have been selected
		sel_fields = [];
		var temp_check = $(view_fields.$el).find('input[type=radio]');

		//var temp_check = $(view_fields.$el).find('input[type=checkbox]');
		for (var i=0;i<temp_check.length;i++){
			if (temp_check[i].checked) {
				sel_fields.push(temp_check[i].value);
			}
		}

		opts = {};
		opts['csrfmiddlewaretoken'] = crsf_token;
		//opts['workflow_id'] = nr_wcv.getWorkflowID();
		var temp_ns_opts1 = nr_inputs.getNodeSet1();
		var temp_ns_opts2 = nr_inputs.getNodeSet2();
		//console.log('temp_ns_opts2');
		//console.log(temp_ns_opts2);
		opts['node_set_uuid1'] = temp_ns_opts1.node_set_uuid;
		opts['node_set_field1'] = temp_ns_opts1.node_input;
		opts['node_set_uuid2'] = temp_ns_opts2.node_set_uuid;
		opts['node_set_field2'] = temp_ns_opts2.node_input;
		opts['study_uuid'] = externalAssayUuid;
		opts['assay_uuid'] = externalStudyUuid;
		opts['name'] = view_fields.getName();
		opts['description'] = view_fields.getDescription();
		opts['fields[]'] = sel_fields;

		console.log("submitting form");
		console.log(opts);
		console
		//

		if (sel_fields.length > 0) {
			if (opts['node_set_uuid2'] == opts['node_set_uuid1']) {
				// execute the command and send this data with it
				bootbox.alert( "Please choose 2 different nodesets" );
			}
			else if  (opts['name'] == "") {
				bootbox.alert( "Please enter a name", function() { $('#rel_name').focus(); } );
			}
			else {
				create_relation_form.execute(opts);
			}
		}
		else {
			bootbox.alert( "Please select a column to map relationship" );
		}

	}

	nrMod.openFields = function(event) {
		console.log("workflowActions: openFields");
		App.vent.trigger("show_fields");
	}

	nrMod.getDataFields = function(event) {
		console.log("workflowActions: getDataFields");

		opts = {};
		opts['csrfmiddlewaretoken'] = crsf_token;
		opts['workflow_id'] = nr_wcv.getWorkflowID();
		var temp_ns_opts = nr_inputs.getNodeSet1();
		opts['node_set_uuid'] = temp_ns_opts.node_set_uuid;
		opts['node_set_field'] = temp_ns_opts.node_input;
		opts['study_uuid'] = externalAssayUuid;

		// execute the command and send this data with it
		//nodeset_form.execute(opts);
	}

	nrMod.runSingleAnalysis = function(event) {
		console.log("workflowActions: runSingleAnalysis");

		opts = {};
		opts['csrfmiddlewaretoken'] = crsf_token;
		opts['workflow_id'] = nr_wcv.getWorkflowID();
		var temp_ns_opts = nr_inputs.getNodeSet1();
		opts['node_set_uuid'] = temp_ns_opts.node_set_uuid;
		opts['node_set_field'] = temp_ns_opts.node_input;
		opts['study_uuid'] = externalAssayUuid;

		// execute the command and send this data with it
		nodeset_form.execute(opts);
	}

	// Function for running an analysis using an existing node relationship
	nrMod.runRelationAnalysis = function (event) {
		console.log("workflowActions: runRelationAnalysis");

		opts = {};
		opts['csrfmiddlewaretoken'] = crsf_token;
		opts['workflow_id'] = nr_wcv.getWorkflowID();
		opts['node_relationship_uuid'] = nr_inputs.getRelationship();
		opts['study_uuid'] = externalAssayUuid;
		console.log(opts);

		// execute the command and send this data with it
		node_relation_form.execute(opts);
	}


	//===================================================================
	// models
	//===================================================================

	nrMod.fieldModel = Backbone.Model.extend({
		defaults: {
            name: '',
            full_name: '',
            countid: 0,
        },
        initialize: function(){
            //alert("Welcome (nrMod.fieldsModel) to this world");
        }
	});

	nrMod.fieldCollection = Backbone.Collection.extend({
	    model: nrMod.fieldModel,
	});

	nrMod.nodeSetModel = Backbone.Model.extend({
	    //urlRoot: '/api/v1/workflow/'
	    idAttribute: 'uuid',
	    url: function(){ return this.get('resource_uri') ||
	    		this.model.url;
	    	},
	});

	nrMod.nodeSetCollection = Backbone.Collection.extend({
	    urlRoot: '/api/v1/nodeset/',
	    model: nrMod.nodeSetModel,
	    idAttribute: 'uuid',
	    //url: function(){ return this.get('resource_uri') ||
	    //		this.model.url;
	    //	},
	    getOptions: function() {
	    	out_html = "";
	    	model_json = this.toJSON();
	    	for ( var i = 0; i < model_json.length; i++ ) {
	    		//console.log(i);
	    		out_html += '<option value="'+model_json[i].uuid +'">' + model_json[i].name + '</option> '
	    	}
	    	//console.log(out_html);
	    	return out_html;
	    }
	});


	nrMod.workflowModel = Backbone.Model.extend({
	    //urlRoot: '/api/v1/workflow/'
	    idAttribute: 'uuid',
	    url: function(){ return this.get('resource_uri') ||
	    		this.model.url;
	    	},
	    defaults: {
	    	name: '',
	    	}

	});

	nrMod.workflowCollection= Backbone.Collection.extend({
	    urlRoot: '/api/v1/workflow/',
	    model: nrMod.workflowModel,
	});

	/*
	var nodePairModel = Backbone.RelationalModel.extend({
	    urlRoot: '/api/v1/nodepair/',
	    idAttribute: 'uuid',
	});
	*/

	nrMod.nodeRelationshipModel = Backbone.Model.extend({
	    //urlRoot: '/api/v1/workflow/'
	    idAttribute: 'uuid',
	    url: function(){ return this.get('resource_uri') ||
	    		this.model.url;
	    	},
	});

	nrMod.nodeRelationshipCollection = Backbone.Collection.extend({
	    urlRoot: '/api/v1/noderelationship/',
	    model: nrMod.nodeRelationshipModel,

	    getOptions: function() {
	    	out_html = "";
	    	model_json = this.toJSON();
	    	for ( var i = 0; i < model_json.length; i++ ) {
	    		//console.log(i);
	    		out_html += '<option value="'+model_json[i].uuid +'">' + model_json[i].name + '</option> '
	    	}
	    	//console.log(out_html);
	    	return out_html;
	    }
	});


	//===================================================================
	// views
	//===================================================================

	nrMod.fieldItemView = Marionette.ItemView.extend({
		template: '#template_field_item',
		tagName: 'td',

		onRender: function() {
			//console.log("item item");
			//console.log(this.model.get('countid'));
			//console.log(this.$el.html());
			//console.log(this.$el);
			//this.$el.wrap('<tr>');
			//console.log($(this.el));
			//this.$el.html('</tr>'+this.$el.text() + '<tr>');
			//this.$el.attr("class", "checkbox inline");
  			//this.$el.attr( "class", "myclass1 myclass2" );
  			//this.ui.checkbox.addClass('checked');
		},

	});
	nrMod.fieldCollectionView = Marionette.CollectionView.extend({
		tagName: "tr",
		itemView: nrMod.fieldItemView,

		ui: {
			form_name: "#rel_name",
			form_description: "#rel_description",
		},

		initialize: function(opts) {
			console.log("fieldCollectionView initialized");
			console.log(opts);
			//var current_uuid = $(this.el).val();

		},
		onRender: function() {
			console.log("fieldCollectionView onRendeer called");
			console.log($(this.el));
			console.log(this.$el);
		},

		getName: function() {
			return $(this.ui.form_name).val();
		},

		getDescription: function() {
			return $(this.ui.form_description).val();
		},
	});

	nrMod.workflowItemView = Marionette.ItemView.extend({
		template: '#template_workflow_item',
		tagName: 'option',

		render: function() {
			//console.log("workflowItemView render called");
			$(this.el).attr('value', this.model.get('uuid')).html(this.model.get('name'));
			return this;
		}
	});

	nrMod.workflowCollectionView = Marionette.CollectionView.extend({
		tagName: "select",
		itemView: nrMod.workflowItemView,
		ui_name: "wcv_dropdown",
		current_uuid: "",

		initialize: function(opts) {
			var current_uuid = $(this.el).val();
			this.current_uuid = current_uuid;
		},

		events: {
			"change": "changeWorkflow"
		},

		onRender: function() {
			//console.log("workflowCollectionView render called");
			$(this.el).attr('id', this.ui_name);
			$(this.el).attr('style','width: 50%;');
			return this;
		},

		changeWorkflow: function(event) {
			//event.preventDefault();
			//console.log($(this.el).val());
			var current_uuid = $(this.el).val();
			this.current_uuid = current_uuid;

			var workflow_inputs = _.find(this.collection.models, function(w2) {
				return w2.attributes.uuid == current_uuid;
			});
			this.workflow_inputs = workflow_inputs;

			// creates it as select2 checkbox
			$(this.el).select2();

			App.vent.trigger("change_inputs", this.workflow_inputs);
		},

		getWorkflowID: function () {
			//console.log("workflowCollectionView getWorkflowID called");
			return $(this.el).val();
		}

	});

	nrMod.inputRelationshipView = Marionette.ItemView.extend({
		current_inputs: '',
		template_holder: '',
		node_set_options: '',
		node_relations_options: '',
		set1_field: '',
		set2_field: '',
		is_single: true,

		ui: {
			set1: "#dropdown_set1",
			set2: "#dropdown_set2",
			relation: "#dropdown_noderelationship",
			btn_single: "#run_analysis_single_btn",
			btn_multi: "#run_analysis_multi_btn",
			btn_relation: "#new_relationship_btn",
		},

		events: {
			'change #dropdown_set1' : 'changeSet1',
			'change #dropdown_set2' : 'changeSet2',
		},

		activateSelect : function() {
			//console.log("activateSelect called");
			// creates it as select2 checkbox
			//console.log("before select2 on set1");
			$(this.ui.set1).select2({placeholder: "Select a NodeSet"});
			$(this.ui.relation).select2({placeholder: "Select a Relationship"});
			if (!this.is_single) {
				//console.log("before select1 on set1");
				$(this.ui.set2).select2({placeholder: "Select a NodeSet"});
			}
		},

		render: function() {
			//console.log("inputRelationshipView render called");
			is_single = true;

			if (this.current_inputs != '') {
				var temp_options = this.node_set_options;
				var temp_html = '<form class="form-horizontal"><fieldset>';
				temp_html += '<legend>Run Analysis</legend>';
				var self = this;

				_.each(this.current_inputs, function (w2) {
					//console.log("inputRelationshipView each"); console.log(w2);
					if (w2.set1 != null) {
						if (w2.set2 == null) {
							//console.log("set2 IS NULL");
							temp_html += '<div class="control-group">';
							temp_html += '<label class="control-label" for="set1">Set1</label>';
							temp_html += '<div class="controls"> <select id="dropdown_set1" name="set1" style="width: 50%;")>'
						 + temp_options + '</select>';
						 	temp_html += '</div>';
						 	temp_html += '</div>';

							temp_html += '<div class="control-group">';
							temp_html += '<div class="controls">';
						 	temp_html += '<a id="run_analysis_single_btn" href="#" onclick="nrApp.nrMod.runSingleAnalysis()" role="button" class="btn btn-warning" data-toggle="modal" rel="tooltip" data-placement="" data-html="true" data-original-title="Launch IGV with&lt;br&gt;current selection.">';
						 	temp_html += '<i class="icon-dashboard"></i>&nbsp;&nbsp;Run Analysis</a>';
						 	temp_html += '</div>';
						 	temp_html += '</div>';
						}
						else{
							is_single = false;
							///* For creating multiple dropdowns for 2 inputs to a workflows
							temp_html += '<div class="control-group">';
							temp_html += '<label class="control-label" for="set1">' + self.set1_field + '</label>';
							temp_html += '<div class="controls"> <select id="dropdown_set1" name="set1" style="width: 50%;">'
						 + temp_options + '</select>';

						 	temp_html += '</div>';
						 	temp_html += '</div>';
						 	temp_html += '</div>';

							temp_html += '<div class="control-group">';
							temp_html += '<label class="control-label" for="set2">' + self.set2_field + '</label>';
							temp_html += '<div class="controls"> <select id="dropdown_set2" name="set2" style="width: 50%;">'
							+ temp_options + '</select></div></div>';
							temp_html += '</div>';

							temp_html += '<div class="control-group">';
							temp_html += '<div class="controls">';

							temp_html += '</div></div>';

							//creates node relationship drop down section
							if (this.node_relations_options != '') {
								temp_html += self.getNodeRelationshipHTML();
							}
						}
					}
				});

				this.is_single = is_single;

				temp_html += '</fieldset></form>';
				//temp_html += this.getNodeRelationshipHTML();

				$(this.el).html(temp_html);

				this.activateSelect();

				// if no available node sets
				if (this.node_set_options == '') {
					$(this.ui.btn_single).addClass("disabled");
					$(this.ui.btn_relation).addClass("disabled");
				}
				// if no available node relationships
				if (this.node_relations_options == '') {
					$(this.ui.btn_multi).addClass("disabled");
				}

				return this;
			}
		},

		getNodeRelationshipHTML: function() {

			//var t_html ='<form class="form-horizontal"><fieldset>';
			//t_html += '<legend>Run Analysis</legend>';
			var t_html = '<div class="control-group">';
			t_html += '<label class="control-label" for="dropdown_noderelationship">Choose Relationship</label>   \
			<div class="controls"> <select id="dropdown_noderelationship" name="Choose Relationship" style="width: 50%;">'
			+ this.node_relations_options + '</select>';

			t_html += '<a id="new_relationship_btn" href="#" onclick="nrApp.nrMod.openFields()" role="button" class="btn btn-warning">';
			t_html += '<i class="icon-plus"></i>&nbsp;&nbsp;New</a>';

			t_html += '</div></div>';
			t_html += '</div>';

			t_html += '<div class="control-group">';
			t_html += '<div class="controls">';
			t_html += '<a id="run_analysis_multi_btn" href="#" onclick="nrApp.nrMod.runRelationAnalysis()" role="button" class="btn btn-warning">';
			t_html += '<i class="icon-sitemap"></i>&nbsp;&nbsp;Run Analysis</a>';
			t_html += '</div></div>';
			t_html += '</div>';
			//t_html += '</fieldset></form>';
			return t_html;
		},

		changeInputs: function (new_inputs) {
			//console.log("inputRelationshipView changeInputs called");
			this.current_inputs = new_inputs.get("input_relationships");

			var set1_field;
			var set2_field;
			_.each(this.current_inputs, function (w2) {
				set1_field = w2.set1;
				set2_field = w2.set2;
			});

			this.set1_field = set1_field;
			this.set2_field = set2_field;

			this.render();

		},

		changeSet1: function() {
			console.log("changeSet1");
			console.log($(this.ui.set1).val());
		},
		changeSet2: function() {
			console.log("changeSet2");
			console.log($(this.ui.set2).val());
		},
		getNodeSet1: function() {
			return {node_input:this.set1_field, node_set_uuid:$(this.ui.set1).val()};
		},

		getNodeSet2: function() {
			return {node_input:this.set2_field, node_set_uuid:$(this.ui.set2).val()};
		},

		setNodeSet: function(opt) {
			//console.log("setNodeSet called");
			this.node_set_options = opt;
		},

		setNodeRelations: function(opt) {
			//console.log("setNodeSetRelations called");
			this.node_relations_options = opt;
		},
		getRelationship: function () {
			//console.log("getRelationship called");
			return $(this.ui.relation).val();
		},

	});

	App.vent.on("noderelationship:new", function(ret){
		//console.log("noderelationship:new called VENT");
		// refreshing updated node relationships

		console.log(ret);

		nr_inputs.setNodeRelations(model_noderelation.getOptions());
		App.p_inputs.show(nr_inputs);

		nr_inputs.activateSelect();

		//Object {matches: "2", node2_count: "2", total: "4", node1_count: "2"}
		var output_str = '<div class="modal-header"><h3>';
		output_str += 'Match results'
		output_str +='</h3>'
		//output_str += ret.total + "," + ret.node1_count + "," + ret.node2_count + "," + ret.matches;
		output_str += '</div>';
		output_str += '<div class="modal-body">';
		output_str += '<p>' + 'Total Matches: ' + ret.matches + '</p>';
		output_str += '<p>' + 'Total NodeSet 1 Files: ' + ret.node1_count + '</p>';
		output_str += '<p>' + 'Total NodeSet 2 Files: ' + ret.node2_count + '</p>';
		output_str += '<div>';



		bootbox.alert(output_str, function() {
  		//Example.show("Hello world callback");
  			tl = new TimelineMax({align:"sequence"});
			tl.add(TweenMax.to("#process_3_p", 1, {autoAlpha:0, ease:Power4.easeInOut}));
			tl.add(TweenMax.to('.scrollable', 2, {scrollTo:{y:$('#process_2').position().top}, ease:Power2.easeOut}));
			tl.play();
		});
	});

	App.vent.on("show_fields", function(){
		//console.log("show_fields called VENT");
		//nr_inputs.changeInputs(wf_inputs);
		tl = new TimelineMax({align:"sequence"});
		tl.add(TweenMax.to("#process_3_p", .5, {autoAlpha:1, ease:Power4.easeInOut}));
		tl.add(TweenMax.to('.scrollable', .5, {scrollTo:{y:$('#process_3_p').position().top}, ease:Power2.easeOut}));
		tl.play();
	});

    App.vent.on("change_inputs", function(wf_inputs){
		//console.log("change inputs called VENT");
		nr_inputs.changeInputs(wf_inputs);

		tl = new TimelineMax({align:"sequence"});
		var temp_delay = 0;
		if ($('#process_3_p').css('opacity') != 0) {
			//tl.add(TweenMax.to("#process_2", .3, { autoAlpha:0, ease:Power4.easeIn}));
			tl.add(TweenMax.to("#process_3_p", .5, {autoAlpha:0, ease:Power4.easeInOut}));
			//temp_delay = .5;
		}
		tl.add(TweenMax.to("#process_2", .5, { autoAlpha:1, ease:Power4.easeIn}));
		tl.play();
	});

	App.vent.on("begin_loaded", function(){
		//console.log("begin_loaded called");
		nr_wcv = new nrMod.workflowCollectionView({collection:model_workflow});

		nr_inputs = new nrMod.inputRelationshipView({collection:model_noderelation});
		nr_inputs.setNodeSet(model_nodeset.getOptions());
		nr_inputs.setNodeRelations(model_noderelation.getOptions());

		App.p_workflow.show(nr_wcv);
		App.p_inputs.show(nr_inputs);

		nr_wcv.changeWorkflow();

		App.p_cols.show(view_fields);

		var tl1 = new TimelineMax({stagger:0.3, align:"normal"});
		tl1.add(TweenMax.to("#process_container", .5, {autoAlpha:1, ease:Power4.easeInOut}));
		tl1.add(TweenMax.to("#process_2", .5, {autoAlpha:1, ease:Power4.easeInOut}));
		tl1.play();

	});

	// Initialize this module when the app starts
	// ------------------------------------------
	nrMod.addInitializer(function(){
		console.log("mod initializer called");

		nrMod.started = true;

		// ajax command for running analyses with nodesetForm
		nodeset_form = Backbone.AjaxCommands.get("nodesetForm");
		nodeset_form.on("success", function(response){
		  window.location = response;
		});

		// ajax command for running analyses with nodeRelationForm
		node_relation_form = Backbone.AjaxCommands.get("nodeRelationForm");
		node_relation_form.on("success", function(response){
		  window.location = response;
		});

		// ajax command for creating node relationships
		create_relation_form = Backbone.AjaxCommands.get("createRelationForm");
		create_relation_form.on("success", function(response){
			console.log("NODE RELATIONSHIPS SUCCESS");
			console.log(response);
			var res = response;

			// manually refreshing node relationships
			deferreds = [];
			deferreds.push(
			model_noderelation.fetch({
				data: {
					study__uuid: externalAssayUuid,
					assay__uuid:externalStudyUuid,
					format:'json'
				}}));

			$.when.apply($, deferreds).done(function() { App.vent.trigger("noderelationship:new", res);} );

		});

		// getting workflows and possible node input models
		deferreds = [];
		model_nodeset = new nrMod.nodeSetCollection();
		model_workflow = new nrMod.workflowCollection();
		deferreds.push(model_nodeset.fetch({data: { study__uuid: externalAssayUuid, assay__uuid:externalStudyUuid, format:'json' }}));
		deferreds.push(model_workflow.fetch());

		model_noderelation = new nrMod.nodeRelationshipCollection();
		deferreds.push(model_noderelation.fetch({data: { study__uuid: externalAssayUuid, assay__uuid:externalStudyUuid, format:'json' }}));
		//deferreds.push(model_noderelation.fetch());

		$.when.apply($, deferreds).done(function() { App.vent.trigger("begin_loaded");} );

	    // holder for creating models out of fields from solr queries
	    query_fields = query.getFacetNames(true);

	    //console.log("contents: Fields" );
	    //console.log(query_fields);
	    model_fields = new nrMod.fieldCollection()
	    for ( field in query_fields ) {
	    	//console.log(prettifySolrFieldName(query_fields[field], true));
	    	var temp_field = new nrMod.fieldModel({name:prettifySolrFieldName(query_fields[field], true), full_name:query_fields[field], countid:field})
			model_fields.add(temp_field);
	    }

		view_fields = new nrMod.fieldCollectionView({collection:model_fields});
	});

});
