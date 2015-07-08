angular
  .module('refineryApp')
  .factory('citationService', [
    '$q',
    'doiService',
    'pubmedService',
    function ($q, doiService, pubmedService) {
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

        var matches = this.value.match(/^(http:\/\/dx\.doi\.org\/)?(doi:\s?)?(10\.[0-9]+\/[a-zA-Z0-9\.\/]+)$/);
        if (matches !== null) {
          // DOI
          return doiService.get({
            id: matches[3]
          }).$promise;
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
          return data.PubmedArticleSet.PubmedArticle.MedlineCitation.Article.Abstract.AbstractText.toString();
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
