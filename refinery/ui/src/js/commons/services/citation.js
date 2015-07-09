angular
  .module('refineryApp')
  .factory('citationService', [
    '$q',
    '_',
    'doiService',
    'pubmedService',
    function ($q, _, doiService, pubmedService) {
      var deferred = $q.defer();

      function get (reference) {

        if (reference >>> 0 === parseFloat(reference)) {
          // PubMed ID
          var summary = pubmedService
            .get(
              'summary',
              {
                id: reference
              }
            )
            .then(function (data) {
              return preparePubmedSummary(reference, data.result[reference]);
            })
            .catch(function (error) {
              return error;
            });

          var abstract = pubmedService
            .get(
              'abstract',
              {
                id: reference
              }
            )
            .then(function (data) {
              return preparePubmedAbstract(data);
            })
            .catch(function (error) {
              return error;
            });

          return $q.all([summary, abstract])
            .then(function (data) {
              data[0].abstract = data[1];
              return data[0];
            })
            .catch(function (error) {
              return error;
            });
        }

        // Check if DOI
        var matches = reference.match(/^(http:\/\/dx\.doi\.org\/)?(doi:\s?)?(10\.[0-9]+\/[a-zA-Z0-9\.\/]+)$/);
        if (matches !== null) {
          // Query the DOI API
          var doi = doiService
            .get({
              id: matches[3]
            })
            .$promise
            .then(function (data) {
              return prepareDoi(data);
            })
            .catch(function (error) {
              return error;
            });

          // Look for a PubMed entry
          var pubmed = pubmedService
            .get(
              'search',
              {
                term: doiService.escape(matches[3])
              }
            )
            .then(function (data) {
              return data.esearchresult.idlist[0];
            })
            .then(function (pubMedId) {
              if (pubMedId) {
                return pubmedService
                  .get(
                    'abstract',
                    {
                      id: pubMedId
                    }
                  )
                  .then(function (data) {
                    return preparePubmedAbstract(data);
                  })
                  .catch(function (error) {
                    return error;
                  });
              }
              return null;
            })
            .catch(function (error) {
              return error;
            });

          return $q.all([doi, pubmed])
            .then(mergeDoiPubmed)
            .catch(function () {
              // In case something failed we will return the DOI promise.
              return doi;
            });
        }

        return $q.reject(
          'Reference ID "' + reference + '" is PubMed ID nor a DOI'
        );
      }

      function extractDois (data) {
        var dois = [];
        try {
          for (var i = 0, len = data.articleids.length; i < len; i++) {
            if (data.articleids[i].idtype === 'doi') {
              dois.push(data.articleids[i].value);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }

      function mergeDoiPubmed (data) {
        data[0].abstract = data[1];
        return data[0];
      }

      function prepareDoi (data) {
        return {
          authors: prepareDoiAuthors(data),
          abstract: null,
          doi: data.DOI,
          issue: data.issue,
          journal: data['container-title'],
          pages: data.page,
          pubmed: null,
          title: data.title,
          volume: data.volume,
          year: data.issued['date-parts'][0]
        };
      }

      function prepareDoiAuthors (data) {
        var authors = '';
        for (var i = 0, len = data.author.length; i < len; i++) {
          var name = data.author[i].family + ' ' + data.author[i].given.slice(0, -1);
          switch (i) {
            // Last author
            case len - 1:
              authors += name;
              break;
            // One before the last author
            case len - 2:
              authors += name + ' and ';
              break;
            // All other authors
            default:
              authors += name + ', ';
              break;
          }
        }
        return authors;
      }

      function preparePubmedAuthors (data) {
        var authors = '';
        for (var i = 0, len = data.authors.length; i < len; i++) {
          switch (i) {
            // Last author
            case len - 1:
              authors += data.authors[i].name;
              break;
            // One before the last author
            case len - 2:
              authors += data.authors[i].name + ' and ';
              break;
            // All other authors
            default:
              authors += data.authors[i].name + ', ';
              break;
          }
        }
        return authors;
      }

      function preparePubmedAbstract (data) {
        try {
          var abstract = data
            .PubmedArticleSet
              .PubmedArticle
                .MedlineCitation
                  .Article
                    .Abstract
                      .AbstractText;

          if (_.isString(abstract)) {
            return abstract;
          }

          return _.isString(abstract['#text']) ? abstract['#text'] : '';
        } catch (e) {
          console.error(e);
          return null;
        }
      }

      function preparePubmedSummary (reference, data) {
        return {
          authors: preparePubmedAuthors(data),
          abstract: null,
          doi: extractDois(data),
          issue: data.issue,
          journal: data.source,
          pages: data.pages,
          pubmed: parseInt(reference),
          title: data.title,
          volume: data.volume,
          year: parseInt(data.pubdate.substr(0, 4))
        };
      }

      return {
        get: get
      };
    }
  ]);
