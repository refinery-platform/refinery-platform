
console.log("contents.workflow called");
//document.write("<script src='moreStuff.js' type='text/javascript'></script>");
var oTable;

// search button functionality 
function AddSearchTerm() { 
	alert("search called");
	event.preventDefault(); // cancel default behavior
	console.log(fields);
	//var values = {};
	//$.each($('#search_form').serializeArray(), function(i, field) {
	//	values[field.name] = field.value;
	//});
	//console.log(values);
}

function workflowActions() {
	
	// validate form inputs: To ensure a workflow is chosen
	$("#submitSamplesBtn").click( function() {
		event.preventDefault(); // cancel default behavior
		
		// getting currently selected workflow
		var temp_value = $("#workflow_choice").val();
		if (temp_value != "") {	
			document.getElementById('sampleForm').action='/analysis_manager/analysis_run/'; // Where to go
			document.getElementById('sampleForm').submit(); // Send POST data and go there
		}
		else { 
			alert("Please Select a Workflow");
		}
  	});

	
	// function for updating available workflows
	$("#workflow_choice").change(function(  ) {
		var temp_url = "/analysis_manager/workflow_inputs/" + $("#workflow_choice").val() + "/";
		console.log(temp_url);
		
		$.ajaxSetup({ 
		     beforeSend: function(xhr, settings) {
		         function getCookie(name) {
		             var cookieValue = null;
		             if (document.cookie && document.cookie != '') {
		                 var cookies = document.cookie.split(';');
		                 for (var i = 0; i < cookies.length; i++) {
		                     var cookie = jQuery.trim(cookies[i]);
		                     // Does this cookie string begin with the name we want?
		                 if (cookie.substring(0, name.length + 1) == (name + '=')) {
		                     cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
		                     break;
		                 }
		             }
		         }
		         return cookieValue;
		         }
		         if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
		             // Only send the token to relative URLs i.e. locally.
		             xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
		         }
		     } 
		});
		
		 $.ajax({
		     url:temp_url,
		     type:"POST",
		     dataType: "json",
		     //data: {csrfmiddlewaretoken: crsf_token },
		     success: function(result){
		     	console.log("success");
		     	console.log(result);
		     	// emptys all dropdown menus with current inputs
		     	$(".OGcombobox").empty();
		     	$('.OGcombobox').append('<option></option>');
		     	// adds options for the specified workflow
		     	for (var i = 0; i < result.length; i++) { 
              		$('.OGcombobox').append('<option value="'+ result[i].fields["name"] + '">' + result[i].fields["name"] + '</option>');
          		}
			}
			});
	});
}

function getColumnNames( fields, addFields ) {
	console.log("getColumnNames called");
	
	var s = '<thead><tr>';
	for ( j in addFields) {
		if ( addFields.hasOwnProperty( j ) ) {
			console.log(j);
			s += "<th>";
			s += prettifyFieldName( addFields[j], true);
			s += "</th>";
		}
	}
	
	for ( field in fields ) {
		if ( fields.hasOwnProperty( field ) ) {
			s += "<th>";
			s += prettifyFieldName(field, true);
			s += "</th>";
		}		
	}
	s+='</tr></thead>'
	return s;
}

// function for initializing datatables functionality
function initDataTable(table_id) { 
	//console.log(table_id);
	
	var selector = ("#"+table_id);
	oTable = $(selector).dataTable({
	"sDom" : "<'row-fluid'<'span6'l><'span6'f>r>t<'row-fluid'<'span6'i><'span6'p>>",
	"bFilter":false,
	"sPaginationType" : "bootstrap",
	"oLanguage" : {
		"sLengthMenu" : "_MENU_ records per page"
	}
	//,
	//"aoColumnDefs":[
	//	{"aTargets":[0],"bSortable":false}]
	});
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
		name = name.substr( 0, position );
	}
	

	var position = name.indexOf( "_Comment_s" );
	if ( position != -1 ) {
		name = name.substr( 0, position );
	}

	name = name.replace( /\_/g, " " );
	
	if ( isTitle )
	{
		name = name.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	}

	return name;	
}