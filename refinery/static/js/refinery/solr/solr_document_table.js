/*
 * solr_document_table.js
 *  
 * Author: Nils Gehlenborg 
 * Created: 28 January 2013
 *
 * A table viewer that operates on a DataSetSolrQuery. 
 */

/*
 * Dependencies:
 * - JQuery
 * - DataSetSolrQuery
 * - SolrSelectClient
 */

SOLR_DOCUMENT_SELECTION_UPDATED_COMMAND = 'solr_document_selection_updated';
SOLR_DOCUMENT_ORDER_UPDATED_COMMAND = 'solr_document_order_updated';
SOLR_DOCUMENT_COUNT_PER_PAGE_UPDATED_COMMAND = 'solr_document_count_per_page_updated';
SOLR_FIELD_VISIBILITY_UPDATED_COMMAND = 'solr_field_visibility_updated';
SOLR_DOCUMENT_TABLE_PAGE_CHANGED_COMMAND = 'solr_document_table_page_changed_command';

SolrDocumentTable = function(
    parentElementId, idPrefix, solrQuery, solrClient, configurator, commands,
    dataSetMonitor) {
  var self = this;
  // parent element for UI
  self._parentElementId = parentElementId;
  // id prefix for all DOM elements to create unique element ids
  self._idPrefix = idPrefix;
  // Solr interaction
  self._query = solrQuery;
  self._client = solrClient;
  self._dataSetMonitor = dataSetMonitor;
  // data set configuration
  self.configurator = configurator;
  // wreqr commands
  self._commands = commands;
  self._documentsPerPage = 10;
  self._hiddenFieldNames = [
    "uuid", "file_uuid", "study_uuid", "assay_uuid", "type", "is_annotation",
    "species", "genome_build", "name"
  ]; // TODO: make these regexes;
  self._additionalColumns = [];
  self.addColumn("",
    function(document) {
      var s = '';
      var id = 'download-' + document["uuid"];
      s += '<span id=' + id + '>';
      s += '<i class="icon-refresh icon-spin" style="padding: 2px"></i>';
      s += '</span>';
      $.ajax({
        url: '/api/v1/node/' + document["uuid"] + '/?format=json',
        type: "GET",
        dataType: "json",
        data: {csrfmiddlewaretoken: csrf_token},
        success: function(result) {
          if ($.isEmptyObject(result)) {
            // do nothing
            $('#' + id).html("");
            return;
          }
          if (result.file_url != null) {
            var link = '<a title="Download linked file" href="' +
              result.file_url + '"><i class="icon-download"></i></a>';
            $('#' + id).html(link)
          }
          else if (result.file_import_status != null) {
            // file import is in progress
            var status = '<i class="icon-bolt"></i>';
            $('#' + id).html(status);
          }
          else {
            // no info received about the file
            $('#' + id).html("");
          }
        },
        error: function(result) {
          $('#' + id).html("");
        }
      });
      return s;
    },
    function(document) {
      alert('Clicked on ' + document['uuid'] + '');
    });
};

SolrDocumentTable.prototype.initialize = function() {
  var self = this;
  return this;
};

/*
 * Render the user interface components into element defined by self.elementId.
 */
SolrDocumentTable.prototype.render = function(solrResponse) {
  var self = this;
  // clear parent element
  $("#" + self._parentElementId).html("");
  self._renderTable(solrResponse);
  //$( "#" + self._parentElementId ).html( code );
  // attach event listeners
  // ..
};

SolrDocumentTable.prototype._renderTable = function(solrResponse) {
  var self = this;
  var tableHead = self._generateTableHead(solrResponse);
  var tableBody = self._generateTableBody(solrResponse);
  var topControlsId = self._idPrefix + '-top-controls';
  var bottomControlsId = self._idPrefix + '-bottom-controls';
  var documentsPerPageControlId = topControlsId + '-documents-per-page';
  var visibleFieldsControlId = topControlsId + '-visible-fields';
  var pagerControlId = bottomControlsId + '-pager';

  $('<div/>', {
    'class': '',
    'id': topControlsId,
    'html': ''
  }).appendTo('#' + self._parentElementId);

  $('<span/>', {
    'class': 'dropdown',
    'id': visibleFieldsControlId,
    'html': ''
  }).appendTo('#' + topControlsId);

  self._generateVisibleFieldsControl(visibleFieldsControlId);

  $('<span/>', {
    'class': 'btn-group',
    'id': documentsPerPageControlId,
    'html': '',
    'data-toggle': 'buttons-radio',
    'style': 'margin-left: 15px;'
  }).appendTo('#' + topControlsId);

  self._generateDocumentsPerPageControl(
    documentsPerPageControlId, [10, 20, 50, 100, 500]);

  $('<table/>', {
    'class': 'table table-striped table-condensed',
    'id': 'table_matrix',
    'html': tableHead + "<tbody>" + tableBody + "</tbody>"
  }).appendTo('#' + self._parentElementId);

  $('<div/>', {
    'class': '',
    'id': bottomControlsId,
    'html': ''
  }).appendTo('#' + self._parentElementId);


  $('<div/>', {
    'class': 'dropdown',
    'id': pagerControlId,
    'html': ''
  }).appendTo('#' + bottomControlsId);

  self._generatePagerControl(pagerControlId, 5, 2, 2);

  // attach events
  $(".field-header-sort").on("click", function(event) {
    var fieldName = $(event.target).data("fieldname");
    self._query.toggleFieldDirection(fieldName);
    self._commands.execute(
      SOLR_DOCUMENT_ORDER_UPDATED_COMMAND, {'fieldname': fieldName});
  });
  // attach event to node selection mode checkbox
  $("#" + "node-selection-mode").click(function(event) {
    if (self._query.getDocumentSelectionBlacklistMode()) {
      self._query.setDocumentSelectionBlacklistMode(false);
      self._query.clearDocumentSelection();
      // update individual checkboxes in table
      $("." + "document-checkbox-select").removeAttr("checked");
    }
    else {
      self._query.setDocumentSelectionBlacklistMode(true);
      self._query.clearDocumentSelection();
      // update individual checkboxes in table
      $("." + "document-checkbox-select").attr("checked", "checked");
    }
    self._commands.execute(
      SOLR_DOCUMENT_SELECTION_UPDATED_COMMAND, {'event': event});
  });

  $(".document-checkbox-select").on("click", function(event) {
    var uuid = $(event.target).data("uuid");
    var uuidIndex = self._query._documentSelection.indexOf(uuid);
    var event = "";

    if (uuidIndex != -1) {
      // remove element
      self._query._documentSelection.splice(uuidIndex, 1);
      event = 'remove';
    }
    else {
      // add element
      self._query._documentSelection.push(uuid);
      event = 'add';
    }

    self._commands.execute(
      SOLR_DOCUMENT_SELECTION_UPDATED_COMMAND, {'uuid': uuid, 'event': event});
  });

  $(".refinery-dnd-handle").on("dragstart", function (event) {
    var uuid = null;
    // here we have to deal with browser specific differences in the dragstart
    // event data structure
    if (event.originalEvent.srcElement) {
      // safari, chrome
      uuid = event.originalEvent.srcElement.attributes['node-uuid'].value;
    }
    else if (event.target) {
      // firefox
      uuid = event.target.attributes['node-uuid'].value;
    }
    else {
      // this browser doesn't seem to support any dragstart known to us
      console.error("Unable to obtain node UUID of draggable.");
    }
    event.originalEvent.dataTransfer.setData(
      'text/plain', JSON.stringify({
        uuid: uuid,
        html: '<table class="table table-striped table-condensed" style="margin-bottom: 0px;">' +
        this.parentElement.parentElement.innerHTML + '</table>'
      })
    );
  });
};

SolrDocumentTable.prototype._generateTableBody = function(solrResponse) {
  var self = this;
  var documents = solrResponse.getDocumentList();
  var fields = self._query._fields;
  var rows = [];
  var analyses = self._dataSetMonitor.analyses;

  for (var i = 0; i < documents.length; ++i) {
    var document = documents[i];
    var s = '<tr>';
    // drag marker (can't be wrapped in span - otherwise Safari won't show the
    // image of dragged content)
    s += '<td>' +
         '<i class="icon-reorder refinery-dnd-handle" data-uuid="' +
         document["uuid"] + '" node-draggable draggable="true" node-uuid="' +
         document["uuid"] + '" style="-khtml-user-drag: element;"></i>' +
         '</td>';
    // selection column
    var isDocumentSelected = self._query.isDocumentSelected(document.uuid);
    s += '<td><label><input class="document-checkbox-select" data-uuid="' +
         document["uuid"] + '" type=\"checkbox\" ' +
         (isDocumentSelected ? "checked" : "") + '></label></td>';
    // additional columns
    for (var j = 0; j < self._additionalColumns.length; ++j) {
      var column = self._additionalColumns[j];
      s += '<td>' + column['formatter'](document) + '</td>';
    }
    for (entry in fields) {
      if (fields.hasOwnProperty(entry) &&
        fields[entry].isVisible && !fields[entry].isInternal && !( self._hiddenFieldNames.indexOf(entry) >= 0 )) {
        if (document.hasOwnProperty(entry)) {

          if (entry.indexOf("REFINERY_ANALYSIS_") === 0) {
            if (analyses !== null) {
              s += "<td title=\"" + document[entry] + "\">";
              s += self._trimDocumentEntry(
                self._dataSetMonitor.getAnalysisLabel(document[entry]), 25);
              s += "</td>";
            }
            else {
              s += "<td title=\"Analysis " + document[entry] + "\">";
              s += '<i class="icon-refresh icon-spin" style="padding: 2px"></i>';
              s += "</td>";
            }
          }
          else {
            s += "<td title=\"" + document[entry] + "\">";
            s += self._trimDocumentEntry(document[entry], 25);
            s += "</td>";
          }
        }
        else { // this field does not exist in this result
          s += "<td>";
          s += "";
          s += "</td>";
        }
      }
    }
    s += "</tr>";
    rows.push(s);
  }
  return rows.join('\n');
};

SolrDocumentTable.prototype._trimDocumentEntry = function(
    string, length, indicator) {

  indicator = indicator || "...";

  if (string.length > length) {
    return string.substring(0, length) +
           "<span style=\"border-radius: 2px; background:lightgray; padding: 2px; font-face: bold; color:gray; display:inline-block; margin-top: -2px; margin-bottom: -2px; margin-left: 2px; margin-right: 2px; vertical-align: bottom;\">" + indicator + "</span>";
  }

  return string;
};

SolrDocumentTable.prototype._generateTableHead = function(solrResponse) {
  var self = this;
  var row = [];
  var fields = self._query._fields;

  var nodeSelectionModeCheckbox = '<label><input id="node-selection-mode" type=\"checkbox\" ' + ( self._query.getDocumentSelectionBlacklistMode() ? "checked" : "" ) + '></label>';
  //$( "#" + "node-selection-column-header" ).html( nodeSelectionModeCheckbox );
  row.push('<th align="left" width="0">' + '</th>');
  row.push('<th align="left" width="0" id="node-selection-column-header">' + nodeSelectionModeCheckbox + '</th>');

  // headers for additional columns
  for (var i = 0; i < self._additionalColumns.length; ++i) {
    var column = self._additionalColumns[i];
    row.push('<th align="left" width="0" id="node-selection-column-header">' + column["name"] + '</th>');
  }

  for (entry in fields) {
    if (fields.hasOwnProperty(entry) && fields[entry].isVisible && !fields[entry].isInternal && !( self._hiddenFieldNames.indexOf(entry) >= 0 )) {
      if (fields[entry].direction === "asc") {
        row.push('<th align=left class="field-header-sort" data-fieldname="' + entry + '"><i class="icon-arrow-down"></i>&nbsp;' + prettifySolrFieldName(entry, true) + '</th>');
      } else if (fields[entry].direction === "desc") {
        row.push('<th align=left class="field-header-sort" data-fieldname="' + entry + '"><i class="icon-arrow-up"></i>&nbsp;' + prettifySolrFieldName(entry, true) + '</th>');
      } else {
        row.push('<th align=left class="field-header-sort" data-fieldname="' + entry + '">' + prettifySolrFieldName(entry, true) + '</th>');
      }
    }
  }

  return "<thead><tr>" + row.join("") + "</tr></thead>";
};

SolrDocumentTable.prototype._generateDocumentsPerPageControl = function (parentElementId, options) {

  var self = this;

  $("#" + parentElementId).html("");

  for (var i = 0; i < options.length; ++i) {
    if (options[i] == self._documentsPerPage) {
      $("#" + parentElementId).append(
        '<button type="button" data-documents="' + options[i] + '" data-toggle="button" class="btn btn-mini active" rel="tooltip" data-placement="bottom" data-html="true" title="View ' + options[i] + ' rows per page">' + options[i] + '</button>');
    }
    else {
      $("#" + parentElementId).append(
        '<button type="button" data-documents="' + options[i] + '" data-toggle="button" class="btn btn-mini" rel="tooltip" data-placement="bottom" data-html="true" title="View ' + options[i] + ' rows per page">' + options[i] + '</button>');
    }
  }

  $("#" + parentElementId).children().click(function (event) {
    if (self._documentsPerPage != $(this).data("documents")) {
      self._documentsPerPage = $(this).data("documents");

      self._query.setDocumentIndex(Math.max(0, self._query.getDocumentIndex() - ( self._query.getDocumentIndex() % self._documentsPerPage )));
      self._query.setDocumentCount(self._documentsPerPage);

      self._commands.execute(SOLR_DOCUMENT_COUNT_PER_PAGE_UPDATED_COMMAND, {'count': self._documents_per_page});
    }
  });
};

SolrDocumentTable.prototype._generateVisibleFieldsControl = function (parentElementId) {

  var self = this;

  var visibleItems = [];
  var invisibleItems = [];

  var fields = self._query._fields;

  for (entry in fields) {
    if (fields.hasOwnProperty(entry)) {
      if (fields[entry].isVisible && !fields[entry].isInternal) {
        visibleItems.push("<a class=\"field-name\">" + '<label id="' + self._composeFieldId(entry) + '" class="checkbox"><input type="checkbox" checked>' + "&nbsp;" + prettifySolrFieldName(entry, true) + "</label></a>");
      }
      else {
        if (self._hiddenFieldNames.indexOf(entry) < 0 && !fields[entry].isInternal) {
          visibleItems.push("<a class=\"field-name\">" + '<label id="' + self._composeFieldId(entry) + '" class="checkbox"><input type="checkbox">' + "&nbsp;" + prettifySolrFieldName(entry, true) + "</label></a>");
        }
      }
    }
  }

  $("#" + parentElementId).html("");
  var listHeader = '<a href="#" class="dropdown-toggle btn btn-mini btn-default" data-toggle="dropdown"><i class="icon-wrench"></i>&nbsp;Columns&nbsp;<i class="icon-caret-down"></i></a>';
  var listId = parentElementId + "-list";

  if (visibleItems.length > 0) {
    var listItems = [];
    for (var i = 0; i < visibleItems.length; ++i) {
      listItems.push("<li>" + visibleItems[i] + "</li>");
    }

    $("#" + parentElementId).append(listHeader + '<ul id="' + listId + '"  style="max-height: 300px;  overflow: hidden; overflow-y: auto;" class="dropdown-menu" role="menu" aria-labelledby="dLabel">' + listItems.join("\n") + '</ul>');
  }

  // configure columns
  $("#" + listId).children().click(function (event) {
    event.stopPropagation();

    var fieldId = event.target.id;

    // user clicked on checkbox -> get id from label, which is the parent of the checkbox
    if (fieldId == "") {
      fieldId = event.target.parentElement.id;
    }

    var field = self._decomposeFieldId(fieldId).field;

    self._query._fields[field].isVisible = !self._query._fields[field].isVisible;
    self._commands.execute(SOLR_FIELD_VISIBILITY_UPDATED_COMMAND, {
      'field': field,
      'isVisible': self._query._fields[field].isVisible
    });
  });
};

SolrDocumentTable.prototype._generatePagerControl = function(
    parentElementId, visiblePages, padLower, padUpper) {
  var self = this;

  $("#" + parentElementId).html("");

  var availablePages = Math.max(0, Math.floor((self._query.getCurrentDocumentCount(false) - 1) / self._documentsPerPage));
  var currentPage = Math.floor(self._query.getDocumentIndex() / self._documentsPerPage);

  if (currentPage > availablePages) {
    currentPage = availablePages;
  }

  if (availablePages < visiblePages) {
    if (currentPage < padLower) {
      padUpper = padUpper + padLower;
      padLower = currentPage;
      padUpper = padUpper - padLower;
    }
  }
  else if (currentPage < padLower) {
    padUpper = padUpper + padLower;
    padLower = currentPage;
    padUpper = padUpper - padLower;
  }
  else if (currentPage > availablePages - padLower) {
    padLower = padLower + padUpper - ( availablePages - currentPage );
    padUpper = availablePages - currentPage;
  }

  var items = [];
  if (currentPage == 0) {
    items.push("<li class=\"disabled\"><a>&laquo;</a></li>");
  }
  else {
    items.push("<li><a href=\"#\" id=\"page-first\">&laquo;</a></li>");
  }

  for (var i = currentPage - padLower; i <= currentPage + padUpper; ++i) {
    if (i == currentPage) {
      items.push("<li class=\"active\"><a href=\"#\" id=\"page-" + (i + 1) + "\">" + (i + 1) + "</a></li>")
    }
    else {
      if (i > availablePages) {
        items.push("<li class=\"disabled\"><a>" + (i + 1) + "</a></li>")
      }
      else {
        items.push("<li><a href=\"#\" id=\"page-" + (i + 1) + "\">" + (i + 1) + "</a></li>")
      }
    }
  }

  if (currentPage == availablePages) {
    items.push("<li class=\"disabled\"><a>&raquo;</a></li>");
  }
  else {
    items.push("<li><a href=\"#\" id=\"page-last\">&raquo;</a></li>")
  }

  $("#" + parentElementId).html("");

  $('<div/>', {
    'class': "pagination",
    html: "<ul>" + items.join('') + "</ul>"
  }).appendTo("#" + parentElementId);

  $("[id^=page-]").on("click", function () {

    page = this.id.split("-")[1];

    if (page === "first") {
      currentPage = 0;
    } else if (page === "last") {
      currentPage = availablePages;
    } else {
      currentPage = page - 1;
    }

    self._query.setDocumentIndex(currentPage * self._documentsPerPage);
    self._commands.execute(
      SOLR_DOCUMENT_TABLE_PAGE_CHANGED_COMMAND, {'page': currentPage});
  });
};

SolrDocumentTable.prototype._composeFieldId = function(field) {
  var self = this;
  return (self._idPrefix + "___" + "field" + "___" + field);
};

SolrDocumentTable.prototype._decomposeFieldId = function(fieldId) {
  var self = this;
  return ( {field: fieldId.split("___")[2]} );
};

SolrDocumentTable.prototype.setDocumentsPerPage = function(count, isSilent) {
  var self = this;
  isSilent = typeof isSilent !== 'undefined' ? isSilent : true;
  self._documentsPerPage = count;
  if (!isSilent) {
    self._commands.execute(
      SOLR_DOCUMENT_TABLE_PAGE_CHANGED_COMMAND, {'page': currentPage});
  }
  return self;
};

SolrDocumentTable.prototype.getDocumentsPerPage = function() {
  var self = this;
  return self._documentsPerPage;
};

SolrDocumentTable.prototype.addColumn = function(name, formatter, receiver) {
  var self = this;
  self._additionalColumns.push({
    "name": name,
    "formatter": formatter,
    "receiver": receiver
  });
};
