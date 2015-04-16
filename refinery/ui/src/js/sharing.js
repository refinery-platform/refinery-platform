angular.module("refinerySharing", [])

.controller("refinerySharingController", function ($scope, $http) {
    // there should be a better way to get the user object
    var user = document.getElementById('user').innerText;

    // psuedo-global variables needed for redrawing on window resize
    var dataSetEntries = [];
    var projectEntries = [];
    var workflowEntries = [];
    
    // in case the HTML page has changes
    var dataSetTable = 'data-set-table';
    var workflowTable = 'workflow-table';
    var projectTable = 'project-table';
    var testDiv = 'size-test';

    // Projects
    // $http.get('/api/v1/

    /*
    $http.get("/api/v1/user_multi_permission/?username=" + user + "&format=json").success(function (response) {
        var keys = response.objects[0].keys;
        var permissionMap = response.objects[0].permission_map;

        // data set
        dataSetEntries = getPermissionMap(keys.data_set, permissionMap.data_set);
        
        for (var i = 0; i < dataSetEntries.length; i++) {
            addResourceEntry(dataSetTable, dataSetEntries[i].resName, dataSetEntries[i].groups);
        }

        // project
        projectEntries = getPermissionMap(keys.project, permissionMap.project);
        
        for (var j = 0; j < projectEntries.length; j++) {
            addResourceEntry(projectTable, projectEntries[j].resName, projectEntries[j].groups);
        }

        // workflow
        workflowEntries = getPermissionMap(keys.workflow, permissionMap.workflow);
        
        for (var k = 0; k < workflowEntries.length; k++) {
            addResourceEntry(workflowTable, workflowEntries[k].resName, workflowEntries[k].groups);
        }
    });
    */

    function getPermissionMap(resKeys, resMap) {
        function extractGroups(groups) {
            return groups.map(function (g) {
                // change > read > none
                return {
                    "name": g.name,
                    "permission": g.permission.change? "change" : (g.permission.read? "read": "none")
                };
            });
        }

        var resEntries = [];

        for (var i = 0; i < resKeys.length; i++) {
            resEntries.push({
                resName: resKeys[i],
                groups: extractGroups(resMap[resKeys[i]])
            });
        }

        return resEntries;
    }

    function drawPermissionMap() {
        for (var i = 0; i < dataSetEntries.length; i++) {
            addResourceEntry(dataSetTable, dataSetEntries[i].resName, dataSetEntries[i].groups);
        }

        for (var j = 0; j < projectEntries.length; j++) {
            addResourceEntry(projectTable, projectEntries[j].resName, projectEntries[j].groups);
        }

        for (var k = 0; k < workflowEntries.length; k++) {
            addResourceEntry(workflowTable, workflowEntries[k].resName, workflowEntries[k].groups);
        }
    }

    function addResourceEntry(divId, resName, groups) {
        var divObj = document.getElementById(divId);
        var divWidth = divObj.offsetWidth;
        var htmlToBeAppended = "<br>" + resName;
        // add edit button

        for (var i = 0; i < groups.length; i++) {
            var dotCount = 0;
            var tmpHTMLHead = "<br>&nbsp&nbsp&nbsp&nbsp" + groups[i].name + "&nbsp";
            var tmpHTMLMid = "";
            var tmpHTMLTail = "&nbsp" + groups[i].permission;
            
            while (getTextWidth(testDiv, tmpHTMLHead + tmpHTMLMid + tmpHTMLTail) < divWidth) {
                dotCount++;
                tmpHTMLMid = Array(dotCount + 1).join(".");
            }

            htmlToBeAppended += tmpHTMLHead + tmpHTMLMid + tmpHTMLTail;
        }
        
        divObj.innerHTML += htmlToBeAppended;
    }

    function getTextWidth(divId, text) {
        var testDiv = document.getElementById(divId);
        testDiv.innerHTML = text;
        var length = testDiv.clientWidth;
        testDiv.innerHTML = "";
        return length;
    }

    window.onresize = function (event) {
        var dataSetDiv = document.getElementById(dataSetTable);
        var workflowDiv = document.getElementById(workflowTable);
        var projectDiv = document.getElementById(projectTable);

        dataSetDiv.innerHTML = "<div id='size-test' style='display: hidden; position: absolute; height: auto; width: auto'></div>";
        workflowDiv.innerHTML = "";
        projectDiv.innerHTML = "";

        for (var i = 0; i < dataSetEntries.length; i++) {
            addResourceEntry(dataSetTable, dataSetEntries[i].resName, dataSetEntries[i].groups);
        }

        for (var j = 0; i < workflowEntries.length; i++) {
            addResourceEntry(workflowTable, workflowEntries[j].resName, workflowEntries[j].groups);
        }
        
        for (var k = 0; i < projectEntries.length; i++) {
            addResourceEntry(projectTable, projectEntries[k].resName, projectEntries[k].groups);
        }
    };
})

.directive("sharingData", function() {
    return {
        templateUrl: "/static/partials/sharing_tpls.html",
        restrict: "A"
    };
});
