/*
	1. test which analysis is running 
		if none then redirect
		if one is running then show progress and status for the others
	2. 
*/

AnalysisMonitor = function( uuid, redirectUrl, crsfMiddlewareToken ) {
  	
  	var self = this;
  	self.uuid = uuid;
  	self.redirectUrl = redirectUrl;
  	self.crsfMiddlewareToken = crsfMiddlewareToken;
  
	self.STAGE_WAITING = 1;
	self.STAGE_RUNNING = 2;
	self.STAGE_FINISHED = 3;
	
	self.MODE_PREPEND = 1;
	self.MODE_APPEND = 2;
	self.MODE_OVERWRITE = 3;	
};	
	
	
AnalysisMonitor.prototype.isStageFinished = function ( result ) {
	var self = this;
	 
	if ( !result ) {
		return false;
	}	
	
	var status = false;
	
	if ( result.length == 1) {
		if ((result[0].state == 'SUCCESS') || (result[0].state == 'FAILURE')) { 
			status = true;
		}
	}
	else { 
		status = true;
			
		for ( var i=0; i < result.length; ++i ) { 
			if ((result[i].state == 'PROGRESS') || (result[i].state == 'PENDING') ) { 
				status = false;
			}
		}		
	}
	
	return status;	
};
	
	
AnalysisMonitor.prototype.isStageWaiting = function ( result ) {
	var self = this;
	
	if ( !result ) {
		return true;
	}	
	
	if ( result.length > 0 ) {
		for ( var i = 0; i < result.length; ++i )
			if ( result[i].state == "PROGRESS" || result[i].state == "SUCCESS" || result[i].state == "FAILURE" )
				return false;
	}
	
	return true;
};
	
	
AnalysisMonitor.prototype.isStageRunning = function ( result ) {
	var self = this;
	
	return !self.isStageWaiting( result ) && !self.isStageFinished( result )
};
	
	
AnalysisMonitor.prototype.getStageStatus = function ( result ) {
	var self = this;

	if ( self.isStageWaiting( result ) ) {
		return self.STAGE_WAITING;
	}
		
	if ( self.isStageFinished( result ) ) {
		return self.STAGE_FINISHED;
	}

	if ( self.isStageRunning( result ) ) {
		return self.STAGE_RUNNING;
	}
	
	return self.STAGE_WAITING;
};
	
	
AnalysisMonitor.prototype.printStatus = function ( parentElementId, status, title, message, mode ) {
	var self = this;

	var mode = mode || self.MODE_OVERWRITE;
	var bootstrapClass = "alert-warning";
	
	if ( status == self.STAGE_RUNNING ) {
		bootstrapClass = "alert-info";
	}

	if ( status == self.STAGE_FINISHED ) {
		bootstrapClass = "alert-success";
	}
	
	var code = "";
	code += "<div class=\"row-fluid\">";		                 			
	code += "<div class=\"span12\">";		                 			
	code += "<div class=\"alert " + bootstrapClass + "\"><strong>" + title + "</strong>&nbsp;" + message + "</div>";
	code += "</div>";	
	code += "</div>";
	
	self.writeElement( parentElementId, mode, code );	
};
	
	
AnalysisMonitor.prototype.writeElement = function ( parentElementId, mode, code ) {
	var self = this;

	if ( mode == self.MODE_APPEND ) {
		$( code ).appendTo( parentElementId  );	
	} else if ( mode == self.MODE_PREPEND ) {
		$( code ).prependTo( parentElementId );	
	} else {
		$( parentElementId ).html( code );	
	}	
};
	
	
AnalysisMonitor.prototype.clearElement = function ( parentElementId ) {
	var self = this;

	self.writeElement( parentElementId, self.MODE_OVERWRITE, "" );
}
	
	
AnalysisMonitor.prototype.printProgressBars = function ( parentElementId, mode, result ) {
	var self = this;
	
	if ( !result )
	{
		return;
	}

	var code = "";
	code += "<div class=\"well well-large\">";
	
	for ( var i = 0; i < result.length; ++i ) {
		var taskId = result[i].task_id;
		
		if ( !result[i].percent_done )
		{
			continue;
		}
		
		var percentDone = Math.floor( result[i].percent_done.replace("%","") ) + "%";
		
		code += "<div class=\"row-fluid\" id=\"indicator_" + taskId + "\">";		                 			
		code += "	<div class=\"span10\">";
		code += "		<div id=\"bar_wrapper_" + taskId + "\" class=\"progress progress-striped active\">";
		code += "			<div class=\"bar\" id=\"bar_" + taskId + "\" style=\"width:" + percentDone + ";\"></div>";
		code += "		</div>";
		code += "	</div>";
		code += "	<div class=\"span2\">";
		code += "		<strong id=\"progress_" + taskId + "\">" + percentDone + "</strong>";
		code += "	</div>";
		code += "	</div>";
	}	

	code += "</div>";		
	
	self.writeElement( parentElementId, mode, code );	
};
	
	
AnalysisMonitor.prototype.updateStageProgress = function ( result, stageElementId, stageName ) {
	var self = this;
	
	// 1. determine stage (preprocessing, execution, postprocessing) status (pending, running, finished)
	var stageStatus = self.getStageStatus( result );
	
	// 2. print status
	if ( stageStatus == self.STAGE_WAITING ) {
		self.printStatus( stageElementId, stageStatus, "Waiting", stageName + " is pending." );
	}
	
	if ( stageStatus == self.STAGE_RUNNING ) {
		//printStatus( stageElementId, stageStatus, "Running", stageName + " is in progress." );
		self.printProgressBars( stageElementId, self.MODE_OVERWRITE, result );				
	}
		
	if ( stageStatus == self.STAGE_FINISHED ) {
		self.printStatus( stageElementId, stageStatus, "Finished", stageName + " is complete." );
	}	
};
	
	
AnalysisMonitor.prototype.getUpdate = function() {
	var self = this;

	$.ajax({
     url:"/analysis_manager/" + self.uuid + "/",
     type:"POST",
     dataType: "json",
     data: { csrfmiddlewaretoken: self.crsfMiddlewareToken },
     success: function( result ) {
     	if ( $.isEmptyObject( result ) ) {
     		// do nothing
     		return;
     	}     	
     	
		if ( self.isStageFinished( result.cleanup ) ) {
  			//clearTimeout ( timerId );
  			//var url = "/projects/{{ user.get_profile.catch_all_project.uuid }}/analyses/{{ statuses.analysis.uuid }}";
  			window.location = self.redirectUrl;
		}
     	else {
	     	self.updateStageProgress( result.preprocessing, "#preprocessing-status", "File upload" );
    	 	self.updateStageProgress( result.execution, "#execution-status", "Workflow execution" );
     		self.updateStageProgress( result.postprocessing, "#postprocessing-status", "File download");     	     		
     	}
     }
	});
};


AnalysisMonitor.prototype.isAnalysisRunning = function( callbackRunning, callbackFinished ) {
	var self = this;

	$.ajax({
     url:"/analysis_manager/" + self.uuid + "/",
     type:"POST",
     dataType: "json",
     data: { csrfmiddlewaretoken: self.crsfMiddlewareToken },
     success: function( result ) {     	     	
	     	if ( $.isEmptyObject( result ) ) {
	     		// do nothing
	     		return;
	     	}     	
	     	
			if ( !self.isStageFinished( result.postprocessing ) ) {
				callbackRunning();
			}
			else {
				callbackFinished();
			}
    	}
	});
};

AnalysisMonitor.prototype.getAnalysisProgress = function( callbackRunning, callbackFinished ) {
	var self = this;

	$.ajax({
     url:"/analysis_manager/" + self.uuid + "/",
     type:"POST",
     dataType: "json",
     data: { csrfmiddlewaretoken: self.crsfMiddlewareToken },
     success: function( result ) {     	
	     	if ( $.isEmptyObject( result ) ) {
	     		// do nothing
	     		return;
	     	}     	
     	     	
			if ( !self.isStageFinished( result.postprocessing ) ) {
				if ( self.isStageRunning( result.execution ) ) {
					callbackRunning( Math.floor( result.execution[0].percent_done.replace("%","") ) + "%" );					
				}
				else {
					callbackRunning( "0%" );										
				}
			}
			else {
				callbackFinished();
			}
    	}
	});
};