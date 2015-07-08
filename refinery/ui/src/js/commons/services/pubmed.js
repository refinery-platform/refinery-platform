angular
  .module('refineryApp')
  .factory('pubmedService', ['$q', '$http', '$resource', 'x2js', 'settings',
    function ($q, $http, $resource, x2js, settings) {

      /*
       *
       * Example:
       *
       */
      var search = $resource(
        'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=1&term=',
        {
          db: 'pubmed',
          retmode: 'json',
          retmax: 1
        },
        {
          query: {
            method: 'GET',
            isArray: false,
            headers: {
              'Accept': 'application/json'
            }
          }
        }
      );

      /*
       * Fecth full article
       *
       * Example:
       * http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=XML&rettype=abstract&id=25344497
       */
      var abstract = $resource(
        'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi',
        {
          db: 'pubmed',
          retmode: 'xml',
          rettype: 'abstract'
        },
        {
          query: {
            method: 'GET',
            isArray: false,
            headers: {
              'Accept': 'text/xml'
            }
          }
        }
      );

      var abstractNew = {
        get: function (id) {
          var deferred = $q.defer();

          $http({
              headers: {
                'Accept': 'text/xml'
              },
              method: 'GET',
              params: {
                db: 'pubmed',
                id: id,
                retmode: 'xml',
                rettype: 'abstract'
              },
              url: 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi',
              transformResponse:function(data) {
                // convert the data to JSON and provide
                // it to the success function below
                var json = x2js.xml_str2json(data);
                return json;
              }
            })
            .then(function (response) {
              deferred.resolve(response.data);
            })
            .catch(function (error) {
              deferred.reject(error);
            });

          return deferred.promise;
        }
      };

      /*
       * Fetch basic meta data and summary
       *
       * Example:
       * http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=25344497
       *
       * {
       *   "header": {
       *     "type": "esummary",
       *     "version": "0.3"
       *   },
       *   "result": {
       *     "25344497": {
       *       "uid": "25344497",
       *       "pubdate": "2015 Mar 1",
       *       "epubdate": "2014 Oct 24",
       *       "source": "Bioinformatics",
       *       "authors": [
       *         {
       *           "name": "Lekschas F",
       *           "authtype": "Author",
       *           "clusterid": ""
       *         },
       *         {
       *           "name": "Stachelscheid H",
       *           "authtype": "Author",
       *           "clusterid": ""
       *         },
       *         {
       *           "name": "Seltmann S",
       *           "authtype": "Author",
       *           "clusterid": ""
       *         },
       *         {
       *           "name": "Kurtz A",
       *           "authtype": "Author",
       *           "clusterid": ""
       *         }
       *       ],
       *       "lastauthor": "Kurtz A",
       *       "title": "Semantic Body Browser: graphical exploration of an organism and spatially resolved expression data visualization.",
       *       "sorttitle": "semantic body browser graphical exploration of an organism and spatially resolved expression data visualization ",
       *       "volume": "31",
       *       "issue": "5",
       *       "pages": "794-6",
       *       "lang": [
       *         "eng"
       *       ],
       *       "nlmuniqueid": "9808944",
       *       "issn": "1367-4803",
       *       "essn": "1367-4811",
       *       "pubtype": [
       *         "Journal Article"
       *       ],
       *       "recordstatus": "PubMed - in process",
       *       "pubstatus": "256",
       *       "articleids": [
       *         {
       *           "idtype": "pii",
       *           "idtypen": 4,
       *           "value": "btu707"
       *         },
       *         {
       *           "idtype": "doi",
       *           "idtypen": 3,
       *           "value": "10.1093/bioinformatics/btu707"
       *         },
       *         {
       *           "idtype": "pubmed",
       *           "idtypen": 1,
       *           "value": "25344497"
       *         },
       *         {
       *           "idtype": "eid",
       *           "idtypen": 8,
       *           "value": "25344497"
       *         },
       *         {
       *           "idtype": "rid",
       *           "idtypen": 8,
       *           "value": "25344497"
       *         }
       *       ],
       *       "history": [
       *         {
       *           "pubstatus": "aheadofprint",
       *           "date": "2014/10/24 00:00"
       *         },
       *         {
       *           "pubstatus": "entrez",
       *           "date": "2014/10/26 06:00"
       *         },
       *         {
       *           "pubstatus": "pubmed",
       *           "date": "2014/10/26 06:00"
       *         },
       *         {
       *           "pubstatus": "medline",
       *           "date": "2014/10/26 06:00"
       *         }
       *       ],
       *       "references": [],
       *       "attributes": [
       *         "Has Abstract"
       *       ],
       *       "pmcrefcount": 0,
       *       "fulljournalname": "Bioinformatics (Oxford, England)",
       *       "elocationid": "doi: 10.1093/bioinformatics/btu707",
       *       "viewcount": 112,
       *       "doctype": "citation",
       *       "srccontriblist": [],
       *       "booktitle": "",
       *       "medium": "",
       *       "edition": "",
       *       "publisherlocation": "",
       *       "publishername": "",
       *       "srcdate": "",
       *       "reportnumber": "",
       *       "availablefromurl": "",
       *       "locationlabel": "",
       *       "doccontriblist": [],
       *       "docdate": "",
       *       "bookname": "",
       *       "chapter": "",
       *       "sortpubdate": "2015/03/01 00:00",
       *       "sortfirstauthor": "Lekschas F",
       *       "vernaculartitle": ""
       *     },
       *     "uids": [
       *       "25344497"
       *     ]
       *   }
       * }
       */
      var summary = $resource(
        'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi',
        {
          db: 'pubmed',
          retmode: 'json'
        },
        {
          query: {
            method: 'GET',
            isArray: false,
            headers: {
              'Accept': 'application/json'
            }
          }
        }
      );

      function get (resource, queryTerms) {
        if (resource === 'abstract') {
          var deferred = $q.defer();

          abstractNew
            .get(queryTerms)
            .then(function (data) {
              deferred.resolve(data);
            })
            .catch(function (error) {
              deferred.reject(error);
            });

          return deferred.promise;
        }

        if (resource === 'search') {
          return search.query(queryTerms).$promise;
        }

        if (resource === 'summary') {
          return summary.query(queryTerms).$promise;
        }

        return $q.reject('Resource "' + resource + '" not found.');
      }

      return {
        get: get
      };
    }
  ]);
