// Nils Gehlenborg, July 2012
// start scope
(function () {
// ---------------------------------

  var MAX_DOWNLOAD_FILES = 20;
  var MESSAGE_DOWNLOAD_UNAVAILABE = "You have to be logged in<br> and selected " + MAX_DOWNLOAD_FILES + " files or less<br>to create an archive for download.";
  var MESSAGE_DOWNLOAD_AVAILABLE = "Click to create<br>archive for download<br>of selected files.";

  var allowAnnotationDownload = false;

  var solrRoot = document.location.protocol + "//" + document.location.host + "/solr/";
  var solrSelectUrl = solrRoot + "data_set_manager/select/";
  var solrSelectEndpoint = "data_set_manager/select/";
  var solrIgvUrl = solrRoot + "igv/";

  var dataSetNodeTypes = ['"Raw Data File"', '"Derived Data File"', '"Array Data File"', '"Derived Array Data File"', '"Array Data Matrix File"', '"Derived Array Data Matrix File"'];

  var dataQueryString = undefined;
  var annotationQueryString = undefined;

  var currentStudyUuid = externalStudyUuid;
  var currentStudyId = externalStudyId;
  var currentAssayUuid = externalAssayUuid;
  var currentAssayId = externalAssayId;
  var currentAnalysisUuid = analysisUuid;

  $(document).ready(function () {
    configurator = new DataSetConfigurator(externalStudyUuid, externalAssayUuid, "configurator-panel", REFINERY_API_BASE_URL, csrf_token);
    configurator.initialize();

    // event handling
    var documentTableCommands = new Backbone.Wreqr.Commands();
    var facetViewCommands = new Backbone.Wreqr.Commands();
    var analysisViewCommands = new Backbone.Wreqr.Commands();
    var pivotMatrixCommands = new Backbone.Wreqr.Commands();
    var clientCommands = new Backbone.Wreqr.Commands();
    var queryCommands = new Backbone.Wreqr.Commands();
    var dataSetMonitorCommands = new Backbone.Wreqr.Commands();

    var lastSolrResponse = null,
        lastProvVisSolrResponse = null;

    var showAnnotation = false;

    configurator.initialize(function () {
      query = new SolrQuery(configurator, queryCommands);
      query.initialize();

      if (analysisUuid !== 'None') {
          query.updateFacetSelection('REFINERY_ANALYSIS_UUID_' + externalStudyId + '_' + externalAssayId + '_s', analysisUuid, true);
      }
      else {
      }

      dataSetMonitor = new DataSetMonitor(dataSetUuid, REFINERY_API_BASE_URL, csrf_token, dataSetMonitorCommands);
      dataSetMonitor.initialize();

      query.addFilter("type", dataSetNodeTypes);
      query.addFilter("is_annotation", false);

      var dataQuery = query.clone();
      dataQuery.addFilter("is_annotation", false);

      var annotationQuery = query.clone();
      annotationQuery.addFilter("is_annotation", true);

      var pivotQuery;

      var provVisQuery;

      // =====================================

      function updateDownloadButton(button_id) {
        if (query.getCurrentDocumentCount() > MAX_DOWNLOAD_FILES || query.getCurrentDocumentCount() <= 0 || !REFINERY_USER_AUTHENTICATED || ( showAnnotation && !allowAnnotationDownload )) {
          $("#" + button_id).addClass("disabled");
          $("#" + button_id).attr("data-original-title", MESSAGE_DOWNLOAD_UNAVAILABE);
        } else {
          $("#" + button_id).removeClass("disabled");
          $("#" + button_id).attr("data-original-title", MESSAGE_DOWNLOAD_AVAILABLE);
        }
      }

      function updateIgvButton(button_id) {
        if (query.getCurrentDocumentCount() <= 0) {
          $("#" + button_id).addClass("disabled");
        } else {
          $("#" + button_id).removeClass("disabled");
        }
      }

      // =====================================


      var client = new SolrClient(solrRoot,
        solrSelectEndpoint,
        csrf_token,
        "django_ct:data_set_manager.node",
            "(study_uuid:" + currentStudyUuid + " AND assay_uuid:" + currentAssayUuid + ")",
        clientCommands);

      queryCommands.addHandler(SOLR_QUERY_DESERIALIZED_COMMAND, function (arguments) {
        //console.log( SOLR_QUERY_DESERIALIZED_COMMAND + ' executed' );
        //console.log( query );

        query.setDocumentIndex(0);

        client.run(query, SOLR_FULL_QUERY);
      });

      queryCommands.addHandler(SOLR_QUERY_SERIALIZED_COMMAND, function (arguments) {
        //console.log( SOLR_QUERY_SERIALIZED_COMMAND + ' executed' );

        // do nothing
      });

      clientCommands.addHandler(SOLR_QUERY_INITIALIZED_COMMAND, function (arguments) {
        //console.log( SOLR_QUERY_INITIALIZED_COMMAND + ' executed' );
        //console.log( arguments );
        if (arguments.query && !(arguments.query instanceof SolrQuery)) {
          return;
        }

          tableView = new SolrDocumentTable("solr-table-view", "solrdoctab1", query, client, configurator, documentTableCommands, dataSetMonitor);
          tableView.setDocumentsPerPage(20);
          analysisView = new SolrAnalysisView("solr-analysis-view", "solranalysis1", query, configurator, analysisViewCommands, dataSetMonitor);
          facetView = new SolrFacetView("solr-facet-view", "solrfacets1", query, configurator, facetViewCommands);
          documentCountView = new SolrDocumentCountView("solr-document-count-view", "solrcounts1", query, undefined);

          pivotMatrixView = new SolrPivotMatrix("solr-pivot-matrix", "solrpivot1", query, {}, pivotMatrixCommands);

          // render pivot matrix upon activation of tab (otherwise the labels will be missing because their
          // width cannot be determined while the matrix is not visible (getBBox and getBoundingClientRect don't work)
        $('#view-selector').on("change", function (e) {
          if (e.val === "pivot-view-tab") {
                pivotMatrixView.render();
            }
          });

        $('#view-selector').on("change", function (e) {
          if (e.val === "provenance-view-tab") {
              if (provvis.get() instanceof provvisDecl.ProvVis === true) {
                provvisRender.update(provvis.get(), lastProvVisSolrResponse);
              } else {
                provVisQuery = query.clone();
                provVisQuery.setDocumentCount(provVisQuery.getTotalDocumentCount());
                provVisQuery.setDocumentIndex(0);
                client.run(provVisQuery, SOLR_FULL_QUERY);
              }
            }
          });

          query.setDocumentIndex(0);
          query.setDocumentCount(tableView.getDocumentsPerPage());

          if (pivotMatrixView.getFacet1() === undefined && pivotMatrixView.getFacet2() === undefined) {

            var visibleFacets = [];
            for (var i = 0; i < configurator.state.objects.length; ++i) {
              var attribute = configurator.state.objects[i];
              if (attribute.is_facet && attribute.is_exposed && !attribute.is_internal) {
                visibleFacets.push(attribute.solr_field);
              }
            }

            var facetOneInd = 0;
            //conditional is required because visibleFacets has incorrect
            // isExposed attributes
            while(facetOneInd <= visibleFacets.length - 1) {
              if(!(visibleFacets[facetOneInd].indexOf("ANALYSIS") > -1 ||
                visibleFacets[facetOneInd].indexOf("WORKFLOW_OUTPUT") > -1))
              {
                pivotMatrixView.setFacet1(visibleFacets[facetOneInd]);
                break;
              } else {
                facetOneInd = facetOneInd + 1;
              }
            };

            var facetTwoInd = facetOneInd + 1;
            while(facetTwoInd <= visibleFacets.length - 1){
              if(!(visibleFacets[facetTwoInd].indexOf("ANALYSIS") > -1 ||
                visibleFacets[facetTwoInd].indexOf("WORKFLOW_OUTPUT") > -1))
              {
                pivotMatrixView.setFacet2(visibleFacets[facetTwoInd]);
                break;
              } else {
                facetTwoInd = facetTwoInd + 1;
              }
            };

            if(pivotMatrixView.getFacet1 !== undefined && pivotMatrixView.getFacet2 !== undefined ) {
              query.setPivots(visibleFacets[facetOneInd], visibleFacets[facetTwoInd]);
            }
          }

          client.run(query, SOLR_FULL_QUERY);
      });


      clientCommands.addHandler(SOLR_QUERY_UPDATED_COMMAND, function (arguments) {
        // console.log(SOLR_QUERY_UPDATED_COMMAND + ' executed');

        // update global query strings
        if (!showAnnotation) {
          dataQueryString = client.createUnpaginatedUrl(query, SOLR_SELECTION_QUERY)
          annotationQueryString = client.createUnpaginatedUrl(annotationQuery, SOLR_SELECTION_QUERY);

          if (nodeSetManager.currentSelectionNodeSet != null) {
            nodeSetManager.currentSelectionNodeSet.solr_query = client.createUrl(query, SOLR_FULL_QUERY);
            nodeSetManager.currentSelectionNodeSet.solr_query_components = query.serialize();
            nodeSetManager.currentSelectionNodeSet.node_count = query.getCurrentDocumentCount();
            nodeSetManager.updateState(nodeSetManager.currentSelectionNodeSet,
            function(){ $(document).trigger('refinery/updateCurrentNodeSelection')});
              //global event to update angularjs nodeSetList);
            // console.log("Updated current selection node set (facet selection).");
          }
        }
        else {
          dataQueryString = client.createUnpaginatedUrl(dataQuery, SOLR_SELECTION_QUERY);
          annotationQueryString = client.createUnpaginatedUrl(query, SOLR_SELECTION_QUERY);
        }

        lastSolrResponse = arguments.response;

          if (arguments.query == pivotQuery) {
            pivotMatrixView.updateMatrix(arguments.response)
          }

          if (arguments.query == query) {
            tableView.render(arguments.response);

            analysisView.render(arguments.response);
            facetView.render(arguments.response);

            documentCountView.render(arguments.response);
            pivotMatrixView.render(arguments.response);
            updateDownloadButton("submitReposBtn");
            updateIgvButton("igv-multi-species");
        }

          if (pivotMatrixView._matrix === undefined) {
              pivotMatrixView.updateMatrix(arguments.response);
          }

          /* Set face attributes for nodes in Provenance Visualization.*/
          if (arguments.query == provVisQuery && provvis.get() instanceof provvisDecl.ProvVis === false) {
              provvis.run(currentStudyUuid, dataSetMonitor.analyses.objects, arguments.response);
          }

          if (arguments.query == provVisQuery) {
              lastProvVisSolrResponse = arguments.response;
          }

          /* Update Provenance Visualization by filtered nodeset. */
          if (($('.nav-pills li.active a').attr('href').split("#")[1] === 'provenance-view-tab') && arguments.query == provVisQuery && provvis.get() instanceof provvisDecl.ProvVis) {
              provvisRender.update(provvis.get(), arguments.response);
          }
      });

      documentTableCommands.addHandler(SOLR_DOCUMENT_SELECTION_UPDATED_COMMAND, function (arguments) {
        // console.log(SOLR_DOCUMENT_SELECTION_UPDATED_COMMAND + ' executed');
        //console.log( arguments );

        // update global query strings
        if (!showAnnotation) {
          dataQueryString = client.createUnpaginatedUrl(query, SOLR_SELECTION_QUERY)
          annotationQueryString = client.createUnpaginatedUrl(annotationQuery, SOLR_SELECTION_QUERY);

          if (nodeSetManager.currentSelectionNodeSet != null) {
            nodeSetManager.currentSelectionNodeSet.solr_query = client.createUrl(query, SOLR_FULL_QUERY);
            nodeSetManager.currentSelectionNodeSet.solr_query_components = query.serialize();
            nodeSetManager.currentSelectionNodeSet.node_count = query.getCurrentDocumentCount();
            nodeSetManager.updateState(nodeSetManager.currentSelectionNodeSet,
              function(){ $(document).trigger('refinery/updateCurrentNodeSelection')}
              //global event to update angularjs nodeSetList
            );
            // console.log("Updated current selection node set (document selection).");
          }
        }
        else {
          dataQueryString = client.createUnpaginatedUrl(dataQuery, SOLR_SELECTION_QUERY);
          annotationQueryString = client.createUnpaginatedUrl(query, SOLR_SELECTION_QUERY);
        }

        documentCountView.render();

        // update viewer buttons
        updateIgvButton("igv-multi-species");

        if (REFINERY_REPOSITORY_MODE) {
          updateDownloadButton("submitReposBtn");
        }

      });

      documentTableCommands.addHandler(SOLR_DOCUMENT_ORDER_UPDATED_COMMAND, function (arguments) {
        //console.log( SOLR_DOCUMENT_SELECTION_UPDATED_COMMAND + ' executed' );
        //console.log( arguments );

        client.run(query, SOLR_FULL_QUERY);
      });

      documentTableCommands.addHandler(SOLR_FIELD_VISIBILITY_UPDATED_COMMAND, function (arguments) {
        //console.log( SOLR_FIELD_VISIBILITY_UPDATED_COMMAND + ' executed' );
        //console.log( arguments );

        client.run(query, SOLR_FULL_QUERY);
      });


      documentTableCommands.addHandler(SOLR_DOCUMENT_COUNT_PER_PAGE_UPDATED_COMMAND, function (arguments) {
        //console.log( SOLR_DOCUMENT_COUNT_PER_PAGE_UPDATED_COMMAND + ' executed' );
        //console.log( arguments );

        client.run(query, SOLR_FULL_QUERY);
      });


      documentTableCommands.addHandler(SOLR_DOCUMENT_TABLE_PAGE_CHANGED_COMMAND, function (arguments) {
        //console.log( SOLR_DOCUMENT_TABLE_PAGE_CHANGED_COMMAND + ' executed' );
        //console.log( arguments );

        client.run(query, SOLR_FULL_QUERY);
      });


      facetViewCommands.addHandler(SOLR_FACET_SELECTION_CLEARED_COMMAND, function (arguments) {
        //console.log( SOLR_FACET_SELECTION_CLEARED_COMMAND + ' executed' );
        //console.log( arguments );

        client.run(query, SOLR_FULL_QUERY);
      });


      analysisViewCommands.addHandler(SOLR_ANALYSIS_SELECTION_CLEARED_COMMAND, function (arguments) {
        //console.log( SOLR_ANALYSIS_SELECTION_CLEARED_COMMAND + ' executed' );
        //console.log( arguments );

        client.run(query, SOLR_FULL_QUERY);
      });


      var facetSelectionUpdated = function (arguments) {
        query.clearDocumentSelection();
        query.setDocumentSelectionBlacklistMode(true);
        client.run(query, SOLR_FULL_QUERY);

        // clone query to update pivot matrix view
        pivotQuery = query.clone();
        pivotQuery.clearFacetSelection(pivotMatrixView.getFacet1());
        pivotQuery.clearFacetSelection(pivotMatrixView.getFacet2());
        client.run(pivotQuery, SOLR_FULL_QUERY);

        /* ProvVis hook for update. */
        if (provvis.get() instanceof provvisDecl.ProvVis) {
          provVisQuery = query.clone();
          provVisQuery.setDocumentCount(provVisQuery.getTotalDocumentCount());
          provVisQuery.setDocumentIndex(0);
          client.run(provVisQuery, SOLR_FULL_QUERY);
        }
      };

      facetViewCommands.addHandler(SOLR_FACET_SELECTION_UPDATED_COMMAND, facetSelectionUpdated);
      pivotMatrixCommands.addHandler(SOLR_FACET_SELECTION_UPDATED_COMMAND, facetSelectionUpdated);
      analysisViewCommands.addHandler(SOLR_ANALYSIS_SELECTION_UPDATED_COMMAND, facetSelectionUpdated);

      pivotMatrixCommands.addHandler(SOLR_PIVOT_MATRIX_FACETS_UPDATED_COMMAND, function (arguments) {
        //console.log( SOLR_PIVOT_MATRIX_FACETS_UPDATED_COMMAND + ' executed' );
        //console.log( arguments );

        client.run(query, SOLR_FULL_QUERY);
      });


      dataSetMonitorCommands.addHandler(DATA_SET_MONITOR_ANALYSES_UPDATED_COMMAND, function (arguments) {
        // console.log(DATA_SET_MONITOR_ANALYSES_UPDATED_COMMAND + ' executed');
        // console.log(arguments);
        // console.log("Updating tables ...");
        //method is called before the analysisView and tableViews are created
        if('undefined'!== typeof(analysisView)) {
          analysisView.render(lastSolrResponse);
        };

        if('undefined'!== typeof(tableView)) {
          tableView.render(lastSolrResponse);
        };
          client.run(query, SOLR_FULL_QUERY);
      });


      // ---------------------------
      // node set manager
      // ---------------------------
      nodeSetManager = new NodeSetManager(externalStudyUuid, externalAssayUuid, "node-set-manager-controls", REFINERY_API_BASE_URL, csrf_token);
      nodeSetManager.initialize();

      if ($("#" + "node-set-manager-controls").length > 0) {

        nodeSetManager.setLoadSelectionCallback(function (nodeSet) {
            query.deserialize(nodeSet.solr_query_components);
        });

        nodeSetManager.setSaveSelectionCallback(function () {
          var solr_query_components = query.serialize();
          var solr_query = client.createUrl(query, SOLR_FULL_QUERY);

          bootbox.prompt("Enter a Name for the Selection", function (name) {
            if (name === null) {
              bootbox.alert("The selection was not saved.");
            } else {
              nodeSetManager.postState(name, "Summary for Node Set", solr_query, solr_query_components, query.getCurrentDocumentCount(), function () {
                bootbox.alert('The selection was saved as "' + name + '".');
                 //global event to update angularjs nodeSetList
                $(document).trigger('refinery/updateCurrentNodeSelection');
                nodeSetManager.getList(function () {
                  nodeSetManager.renderList()
                });
              });
            }
          });
        });
      }


        // --------------
        // annotation
        // --------------
      $(".annotation-buttons button").click(function () {
        if ($(this).attr("id") == "annotation-button") {
          showAnnotation = true;
          dataQuery = query.clone();
          query = annotationQuery;

          client.initialize(query, false);
        }
        else {
          showAnnotation = false;
          annotationQuery = query.clone();
          query = dataQuery;

          client.initialize(query, false);
        }

        client.run(query, SOLR_FULL_QUERY);
      });

      // do not reset query before execution (otherwise presets such as analysis UUID are lost)
      client.initialize(query, false);
      client.initialize(annotationQuery, false);
    });


    configurator.getState(function () {
        // callback
    });


  });


//$(".collapse").collapse("show");

  function createSpeciesModal(aresult) {
      //console.log("contents.js createSpeciesModal called");
      var ret_buttons = [];

      for (var species in aresult) {
          var session_url = aresult[species];

          ret_buttons.push({
              "label": species,
              "class": "btn-primary",
              "url": session_url
          });
      }

      return ret_buttons;
  }


  var createCallback = function (url) {
      return function () {
          window.open(url);
      };
  };


  $("#igv-multi-species").on("click", function (e) {
    if ($("#igv-multi-species").hasClass("disabled")) {
        return;
    }

    // KILLs AJAX request if already sent
    if (typeof xhr != 'undefined') {
        //kill the request
        xhr.abort()
    }

    // function for getting current solr query
    var solr_url = dataQueryString; //buildSolrQuery( currentAssayUuid, currentStudyUuid, currentNodeType, 0, 10000, facets, fields, {}, false );
    // annotation files solr query -- DO NOT FILTER NODE SELECTION!!! (last parameter set to false, it is true by default)
    var solr_annot = annotationQueryString; //buildSolrQuery( currentAssayUuid, currentStudyUuid, currentNodeType, 0, 10000, {}, fields, {}, true, false );

    // url to point ajax function too
    var temp_url = solrIgvUrl;

    e.preventDefault();

    // clears modal body
    $("#myModalBody").html("Preparing IGV session ... <br>");

    // adding spinner to be removed after ajax callback
    opts["left"] = $("#igvModal").width() / 2 - 30;
    var target = document.getElementById('myModalBody');
    var spinner = new Spinner(opts).spin(target);
    $('#igvModal').modal();


    // --- START: set correct CSRF token via cookie ---
    // https://docs.djangoproject.com/en/1.4/ref/contrib/csrf/#ajax
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

    var csrftoken = getCookie('csrftoken');

    function csrfSafeMethod(method) {
      // these HTTP methods do not require CSRF protection
      return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }

    $.ajaxSetup({
      crossDomain: false, // obviates need for sameOrigin test
      beforeSend: function (xhr, settings) {
        if (!csrfSafeMethod(settings.type)) {
          xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
      }
    });
    // --- END: set correct CSRF token via cookie ---

    var xhr = $.ajax({
      url: temp_url,
      type: "POST",
      dataType: "json",
      data: {'query': solr_url, 'annot': solr_annot, 'node_selection': [], 'node_selection_blacklist_mode': true },
      success: function (result) {

        // stop spinner
        spinner.stop();
        $("#myModalBody").html("");

        var ret_buttons = createSpeciesModal(result.species);

        // if only 1 species returned
        if (ret_buttons.length == 1) {
            $('#igvModal').modal("hide");
            window.location = ret_buttons[0].url;

        }
        else {

            var buttonString = "";
            var speciesString = "";
            if (result.species_count == 0) {
                speciesString = "<p>" + "Your selected samples do not have a " +
                  "defined genome build. To view the samples, open IGV with the proper genome."
            }
            else {
                speciesString = "<p>" + "You selected samples from " +
                  ret_buttons.length + " different genome builds. To view the " +
                  "samples, open IGV with the corresponding genome."
            }

            $("#myModalBody").append(speciesString);
            $("#myModalBody").append("<div class=\"btn-group\" style=\"align: center;\" id=\"launch-button-group\">");
            for (var counter = 0; counter < ret_buttons.length; ++counter) {
                $("#launch-button-group").append("<button class=\"btn btn-primary\" id=\"button_" + counter + "\">" + ret_buttons[counter]["label"] + "</button>");
                $("#" + "button_" + counter).click(createCallback(ret_buttons[counter]["url"]));
            }
        }

      }
    });


  });

  // button for submtting execution of workflows when in REPOSITORY mode
  $("#submitReposBtn").click(function (event) {
    if ($("#submitReposBtn").hasClass("disabled")) {
      return;
    }

    event.preventDefault(); // cancel default behavior

    // console.log("workflowActions: REFINERY_REPOSITORY_MODE");
    // console.log(REFINERY_REPOSITORY_MODE);

    var the_workflow_uuid = $('#submitReposBtn').data().workflow_id;
    // console.log("the_workflow_uuid");
    // console.log(the_workflow_uuid);

    // function for getting current solr query
    var solr_url = dataQueryString; //buildSolrQuery( currentAssayUuid, currentStudyUuid, currentNodeType, 0, 10000, facets, fields, {}, false );


    // --- START: set correct CSRF token via cookie ---
    // https://docs.djangoproject.com/en/1.4/ref/contrib/csrf/#ajax
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

    var csrftoken = getCookie('csrftoken');

    function csrfSafeMethod(method) {
      // these HTTP methods do not require CSRF protection
      return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }

    $.ajaxSetup({
      crossDomain: false, // obviates need for sameOrigin test
      beforeSend: function (xhr, settings) {
          if (!csrfSafeMethod(settings.type)) {
              xhr.setRequestHeader("X-CSRFToken", csrftoken);
          }
      }
    });
    // --- END: set correct CSRF token via cookie ---

    $.ajax({
      url: '/analysis_manager/repository_run/',
      type: "POST",
      dataType: "json",
      data: {'query': solr_url, 'workflow_choice': the_workflow_uuid, 'study_uuid': $('input[name=study_uuid]').val(),
          'node_selection': nodeSelection, 'node_selection_blacklist_mode': nodeSelectionBlacklistMode },
      success: function (result) {
          // console.log(result);
          window.location = result;
      }
    });
  });


// ---------------------------------
})();
// end scope
