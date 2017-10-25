// Nils Gehlenborg, July 2012
// start scope
(function () {
// ---------------------------------

  var allowAnnotationDownload = false;

  var solrRoot = document.location.protocol + "//" + document.location.host + "/solr/";
  var solrSelectUrl = solrRoot + "data_set_manager/select/";
  var solrSelectEndpoint = "data_set_manager/select/";

  var dataSetNodeTypes = ['"Raw Data File"', '"Derived Data File"', '"Array Data File"', '"Derived Array Data File"', '"Array Data Matrix File"', '"Derived Array Data Matrix File"'];

  var dataQueryString = undefined;
  var annotationQueryString = undefined;

  var currentStudyUuid = externalStudyUuid;
  var currentStudyId = externalStudyId;
  var currentAssayUuid = externalAssayUuid;
  var currentAssayId = externalAssayId;

  $(document).ready(function () {
    // To avoid generation when in the current file  browser
    if (window.location.href.indexOf('provenance') > -1) {

      var clientCommands = new Backbone.Wreqr.Commands();
      var queryCommands = new Backbone.Wreqr.Commands();
      var dataSetMonitorCommands = new Backbone.Wreqr.Commands();

      var lastSolrResponse        = null,
          lastProvVisSolrResponse = null;

      var showAnnotation = false;

        dataSetMonitor = new DataSetMonitor(dataSetUuid, REFINERY_API_BASE_URL, csrf_token, dataSetMonitorCommands);
        dataSetMonitor.initialize();

        query.addFilter("type", dataSetNodeTypes);
        query.addFilter("is_annotation", false);

        var dataQuery = query.clone();
        dataQuery.addFilter("is_annotation", false);

        var annotationQuery = query.clone();
        annotationQuery.addFilter("is_annotation", true);

        var provVisQuery;

        // =====================================

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

//** PROVVIS QUERY **//
          $(function() {
            if (provvis.get() instanceof provvisDecl.ProvVis === true) {
              provvisRender.update(provvis.get(), lastProvVisSolrResponse);
            } else {
              provVisQuery = query.clone();
              provVisQuery.setDocumentCount(provVisQuery.getTotalDocumentCount());
              provVisQuery.setDocumentIndex(0);
              client.run(provVisQuery, SOLR_FULL_QUERY);
            }
          });

          query.setDocumentIndex(0);

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
                function () {
                  $(document).trigger('refinery/updateCurrentNodeSelection')
                });
              //global event to update angularjs nodeSetList);
              // console.log("Updated current selection node set (facet selection).");
            }
          }
          else {
            dataQueryString = client.createUnpaginatedUrl(dataQuery, SOLR_SELECTION_QUERY);
            annotationQueryString = client.createUnpaginatedUrl(query, SOLR_SELECTION_QUERY);
          }

          lastSolrResponse = arguments.response;

          if (arguments.query == provVisQuery) {
            /* Set face attributes for nodes in Provenance Visualization.*/
            if (provvis.get() instanceof provvisDecl.ProvVis === false) {
              provvis.run(currentStudyUuid, dataSetMonitor.analyses.objects, arguments.response);
            }

            lastProvVisSolrResponse = arguments.response;

            /* Update Provenance Visualization by filtered nodeset. */
            if (($('.nav-pills li.active a').attr('href').split("#")[1] === 'provenance-view-tab') && provvis.get() instanceof provvisDecl.ProvVis) {
              provvisRender.update(provvis.get(), arguments.response);
            }
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
                function () {
                  $(document).trigger('refinery/updateCurrentNodeSelection')
                }
                //global event to update angularjs nodeSetList
              );
              // console.log("Updated current selection node set (document selection).");
            }
          }
          else {
            dataQueryString = client.createUnpaginatedUrl(dataQuery, SOLR_SELECTION_QUERY);
            annotationQueryString = client.createUnpaginatedUrl(query, SOLR_SELECTION_QUERY);
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

        var facetSelectionUpdated = function (arguments) {
          query.clearDocumentSelection();
          query.setDocumentSelectionBlacklistMode(true);
          client.run(query, SOLR_FULL_QUERY);

          /* ProvVis hook for update. */
          if (provvis.get() instanceof provvisDecl.ProvVis) {
            provVisQuery = query.clone();
            provVisQuery.setDocumentCount(provVisQuery.getTotalDocumentCount());
            provVisQuery.setDocumentIndex(0);
            client.run(provVisQuery, SOLR_FULL_QUERY);
          }
        };

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
    }
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

// ---------------------------------
})();
// end scope
