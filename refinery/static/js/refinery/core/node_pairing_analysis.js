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

// Backbone.AjaxCommands
// ---------------------

Backbone.AjaxCommands = (function (Backbone, $, _) {
    var Commands = {};

    // Private data
    // ------------

    var commandList = {};

    // Public API
    // ----------

    Commands.register = function (commandName, options) {
        commandList[commandName] = options;
    }

    Commands.get = function (commandName) {
        var options = commandList[commandName];
        options = options || {};
        options = _.clone(options);
        var command = new Commands.Command(commandName, options);
        return command;
    };

    // Command Type
    // -------------------

    Commands.Command = function (name, options) {
        this.name = name;
        this.options = options
    };

    _.extend(Commands.Command.prototype, Backbone.Events, {
        execute: function (data) {
            var that = this;

            var config = this.getAjaxConfig(this.options, data);

            this.trigger("before:execute");

            var request = $.ajax(config);
            request.done(function (response) {
                that.trigger("success", response);
            });

            request.fail(function (response) {
                that.trigger("error", response);
            });

            request.always(function (response) {
                that.trigger("complete", response);
            });
        },

        getAjaxConfig: function (options, data) {
            var url = this.getUrl(options, data);

            var ajaxConfig = {
                type: "GET",
                dataType: "JSON",
                url: url
            };

            _.extend(ajaxConfig, options);
            ajaxConfig.data = data;

            return ajaxConfig;
        },

        getUrl: function (options, data) {
            return options.url;
        }
    });

    return Commands;
})(Backbone, $, _);




/*
 * Marionette view of creating node pairs from node sets
 *
 */





var analyzeApp = new Marionette.Application();

//analyzeApp.module('npApp', function(npApp, App, Backbone, Marionette, $, _){

	//===================================================================
	// models
	//===================================================================

	var nodeSetModel = Backbone.Model.extend({
	    //urlRoot: '/api/v1/workflow/'
	    idAttribute: 'uuid',
	    url: function(){ return this.get('resource_uri') ||
	    		this.model.url;
	    	},
	});

	var nodeSetCollection = Backbone.Collection.extend({
	    urlRoot: '/api/v1/nodeset/',
	    model: nodeSetModel,
	    //idAttribute: 'uuid',
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


	var workflowModel = Backbone.Model.extend({
	    //urlRoot: '/api/v1/workflow/'
	    idAttribute: 'uuid',
	    url: function(){ return this.get('resource_uri') ||
	    		this.model.url;
	    	},
	    defaults: {
	    	name: '',
	    	}

	});

	var workflowCollection= Backbone.Collection.extend({
	    urlRoot: '/api/v1/workflow/',
	    model: workflowModel,
	});

	/*
	var nodePairModel = Backbone.RelationalModel.extend({
	    urlRoot: '/api/v1/nodepair/',
	    idAttribute: 'uuid',
	});
	*/

	var nodeRelationshipModel = Backbone.Model.extend({
	    //urlRoot: '/api/v1/workflow/'
	    idAttribute: 'uuid',
	    url: function(){ return this.get('resource_uri') ||
	    		this.model.url;
	    	},
	});

	var nodeRelationshipCollection = Backbone.Collection.extend({
	    urlRoot: '/api/v1/noderelationship/',
	    model: nodeRelationshipModel,

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

	var workflowItemView = Marionette.ItemView.extend({
		template: '#template_workflow_item',
		tagName: 'option',

		render: function() {
			//console.log("workflowItemView render called");
			$(this.el).attr('value', this.model.get('uuid')).html(this.model.get('name'));
			return this;
		}
	});

	var workflowCollectionView = Marionette.CollectionView.extend({
		tagName: "select",
		itemView: workflowItemView,
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
			return this;
		},

		changeWorkflow: function(event) {
			//event.preventDefault();
			//console.log(event);
			//console.log($(this.el).val());
			var current_uuid = $(this.el).val();
			this.current_uuid = current_uuid;

			var workflow_inputs = _.find(this.collection.models, function(w2) {
				return w2.attributes.uuid == current_uuid;
			});
			this.workflow_inputs = workflow_inputs;
			//alert(this.model.name);

			//console.log(workflow_inputs);
			analyzeApp.vent.trigger("change_inputs", this.workflow_inputs); // => alert box "bar"
		},

		getWorkflowID: function () {
			//console.log("workflowCollectionView getWorkflowID called");
			return $(this.el).val();
		}

	});

	var inputRelationshipView = Marionette.ItemView.extend({
		current_inputs: '',
		template_holder: '',
		node_set_options: '',
		node_relations_options: '',
		set1_field: '',
		set2_field: '',

		ui: {
			set1: "#dropdown_set1",
			set2: "#dropdown_set2",
			relation: "#dropdown_noderelationship",
		},

		events: {
			'change #dropdown_set1' : 'changeSet1',
			'change #dropdown_set2' : 'changeSet2',
		},

		render: function() {
			//console.log("inputRelationshipView render called");
			//console.log(this.el);
			//console.log(this.node_set_options);

			if (this.current_inputs != '') {
				var temp_options = this.node_set_options;
				var temp_html = '<form class="form-horizontal"><fieldset>';
				temp_html += '<legend>Run Analysis</legend>';
				var self = this;

				_.each(this.current_inputs, function (w2) {
					//console.log("inputRelationshipView each"); console.log(w2);
					if (w2.set1 != null) {
						if (w2.set2 == null) {
							temp_html += '<div class="control-group">';
							temp_html += '<label class="control-label" for="set1">Set1</label>';
							temp_html += '<div class="controls"> <select id="dropdown_set1" name="set1">'
						 + temp_options + '</select>';
						 	temp_html += '</div>';
						 	temp_html += '</div>';

							temp_html += '<div class="control-group">';
							temp_html += '<div class="controls">';
						 	temp_html += '<a id="run_analysis_single_btn" href="#" onclick="runSingleAnalysis()" role="button" class="btn btn-warning" data-toggle="modal" rel="tooltip" data-placement="" data-html="true" data-original-title="Launch IGV with&lt;br&gt;current selection.">';
						 	temp_html += '<i class="icon-dashboard"></i>&nbsp;&nbsp;Run Analysis</a>';
						 	temp_html += '</div>';
						 	temp_html += '</div>';
						}
					}

					if (w2.set2 != null){

						if (this.node_relations_options != '') {
							temp_html += self.getNodeRelationshipHTML();
						}
						else {

							///* For creating multiple dropdowns for 2 inputs to a workflows
							temp_html += '<div class="control-group">';
							temp_html += '<label class="control-label" for="set1">Set1</label>   \
						<div class="controls"> <select id="dropdown_set1" name="set1">'
						 + temp_options + '</select>';
						 	temp_html += '</div>';
						 	temp_html += '</div>';
						 	temp_html += '</div>';

							temp_html += '<div class="control-group">';
							temp_html += '<label class="control-label" for="set2">Set2</label>   \
							<div class="controls"> <select id="dropdown_set2" name="set2">'
							+ temp_options + '</select></div></div>';
							temp_html += '</div>';

							temp_html += '<div class="control-group">';
							temp_html += '<div class="controls">';
							temp_html += '<a id="run_analysis_single_btn" href="#" onclick="runSingleAnalysis()" role="button" class="btn btn-warning">';
							temp_html += '<i class="icon-sitemap"></i>&nbsp;&nbsp;Create Relationships</a>';
							temp_html += '</div></div>';
							//*/
						}
					}
				});

				temp_html += '</fieldset></form>';
				//temp_html += this.getNodeRelationshipHTML();

				$(this.el).html(temp_html);
				return this;
			}
		},

		getNodeRelationshipHTML: function() {

			//var t_html ='<form class="form-horizontal"><fieldset>';
			//t_html += '<legend>Run Analysis</legend>';
			var t_html = '<div class="control-group">';
			t_html += '<label class="control-label" for="dropdown_noderelationship">Choose Relationship</label>   \
			<div class="controls"> <select id="dropdown_noderelationship" name="Choose Relationship">'
			+ this.node_relations_options + '</select></div></div>';
			t_html += '</div>';

			t_html += '<div class="control-group">';
			t_html += '<div class="controls">';
			t_html += '<a id="run_analysis_single_btn" href="#" onclick="runRelationAnalysis()" role="button" class="btn btn-warning">';
			t_html += '<i class="icon-sitemap"></i>&nbsp;&nbsp;Run Analysis</a>';
			t_html += '</div></div>';
			t_html += '</div>';
			//t_html += '</fieldset></form>';
			return t_html;
		},

		changeInputs: function (new_inputs) {
			//console.log("inputRelationshipView changeInputs called");
			this.current_inputs = new_inputs.get("input_relationships");
			//console.log(this.current_inputs);

			var set1_field;
			var set2_field;
			_.each(this.current_inputs, function (w2) {
				set1_field = w2.set1;
				set2_field = w2.set2;
			});

			this.set1_field = set1_field;
			this.set2_field = set2_field;

			//console.log("set1_field");
			//console.log(this.set1_field);

			this.render();
		},

		changeSet1: function() {
			console.log("changeSet1");
			console.log($(this.ui.set1).val());
		},
		getNodeSet1: function() {
			return {node_input:this.set1_field, node_set_uuid:$(this.ui.set1).val()};
		},
		changeSet2: function() {
			console.log("changeSet2");
			console.log($(this.ui.set2).val());
		},

		setNodeSet: function(opt) {
			console.log("setNodeSet called");
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


//});

analyzeApp.addRegions({
  p_workflow : '#process_1',
  p_inputs   : '#process_2',
  p_cols : '#process_3'
});

// Initialize this module when the app starts
// ------------------------------------------

//analyzeApp.addInitializer(function(){
	//console.log("mod initializer called");
    //analyzeApp.controller = new analyze_nodepair.controller();
//});



//===================================================================
// Button Actions
//===================================================================


function runSingleAnalysis(event) {
	console.log("workflowActions: runSingleAnalysis");

	opts = {};
	opts['csrfmiddlewaretoken'] = crsf_token;
	opts['workflow_id'] = nr_wcv.getWorkflowID();
	var temp_ns_opts = nr_inputs.getNodeSet1();
	opts['node_set_uuid'] = temp_ns_opts.node_set_uuid;
	opts['node_set_field'] = temp_ns_opts.node_input;
	opts['study_uuid'] = externalAssayUuid;
	//console.log("nr_inputs.getNodeSet1()");
	//console.log(nr_inputs.getNodeSet1());

	// execute the command and send this data with it
	nodeset_form.execute(opts);
}

// Function for running an analysis using an existing node relationship
function runRelationAnalysis(event) {
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

// Register a command to use
// -------------------------

// http://lostechies.com/derickbailey/2012/05/04/wrapping-ajax-in-a-thin-command-framework-for-backbone-apps/
Backbone.AjaxCommands.register("nodesetForm", {
  url: "/analysis_manager/run_nodeset/",
  type: "POST",
  dataType: "JSON",
});

// somewhere else in the application, use the command
// --------------------------------------------------
var nodeset_form = Backbone.AjaxCommands.get("nodesetForm");

nodeset_form.on("success", function(response){
  // handle success here
  //console.log("node_set run success called");
  //console.log(response);
  window.location = response;
});




Backbone.AjaxCommands.register("nodeRelationForm", {
  url: "/analysis_manager/run_noderelationship/",
  type: "POST",
  dataType: "JSON",
});

// somewhere else in the application, use the command
// --------------------------------------------------
var node_relation_form = Backbone.AjaxCommands.get("nodeRelationForm");

node_relation_form.on("success", function(response){
  // handle success here
  //console.log("node_relation_form run success called");
  //console.log(response);
  window.location = response;
});



analyzeApp.start();


var view, ui1, ui2, nr_wcv, nr_inputs;

// getting workflows and possible node input models
var deferreds = [];
var model_nodeset = new nodeSetCollection();
var model_workflow = new workflowCollection();
deferreds.push(model_nodeset.fetch({data: { study__uuid: externalAssayUuid, assay__uuid:externalStudyUuid, format:'json' }}));
deferreds.push(model_workflow.fetch());

var model_noderelation = new nodeRelationshipCollection();
//deferreds.push(model_noderelation.fetch({data: { study__uuid: externalAssayUuid, assay__uuid:externalStudyUuid, format:'json' }}));
deferreds.push(model_noderelation.fetch());

$.when.apply($, deferreds).done(startStuff);


analyzeApp.vent.on("change_inputs", function(wf_inputs){
	//console.log("change inputs called VENT");
	nr_inputs.changeInputs(wf_inputs);
});


function startStuff() {
	//console.log("startStuff called");
	nr_wcv = new workflowCollectionView({collection:model_workflow});

	nr_inputs = new inputRelationshipView();
	nr_inputs.setNodeSet(model_nodeset.getOptions());
	nr_inputs.setNodeRelations(model_noderelation.getOptions());

	analyzeApp.p_workflow.show(nr_wcv);
	analyzeApp.p_inputs.show(nr_inputs);

	$.Event("empty");
	nr_wcv.changeWorkflow();
}


