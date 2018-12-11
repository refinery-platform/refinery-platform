/**
 * Video Carousel Directive
 * @namespace rpVideoCarousel
 * @desc Video carousel directive for the landing page.
 * @memberOf refineryApp.refineryHome
 */
(function () {
  'use strict';

  angular
    .module('refineryHome')
    .directive('rpVideoCarousel', rpVideoCarousel);

  rpVideoCarousel.$inject = ['$', '$timeout', '$window', 'YouTube'];

  function rpVideoCarousel ($, $timeout, $window, YouTube) {
    return {
      restrict: 'E',
      templateUrl: function () {
        return $window.getStaticUrl('partials/home/partials/video-carousel.html');
      },
      link: function (scope, elem) {
        // initialize the chart
        // console.log(elem);
        scope.videoIds = ['rdTkUVJYaE0', 'Dd2oZAZJ0-c', 'a11GSabhDfs'];
        // var youtubeReady = false;
        var tag = document.createElement('script');
        tag.src = '';
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        // Variable for the dynamically created youtube players
        var players = [];
        // var isPlaying = false;
        function onYouTubeIframeAPIReady () {
          // The id of the iframe and is the same as the videoId
          console.log(elem[0].getElementsByClassName('.youtube-video'));
          $('.youtube-video').each(function (i, obj) {
            console.log('in the loops');
            // eslint-disable-next-line no-undef
            players[obj.id] = new YouTube.Player(obj.id, {
              videoId: obj.id,
              playerVars: {
                controls: 2,
                rel: 0,
                autohide: 1,
                showinfo: 0,
                modestbranding: 1,
                wmode: 'transparent',
                html5: 1
              },
              events: {
                onStateChange: onPlayerStateChange
              }
            });
          });
           //  youtubeReady = true;
        }

        function onPlayerStateChange (event) {
          var targetControl = $(
            event.target.getIframe()
          ).parent().parent().parent().find('.controls');

          var targetCaption = $(event.target.getIframe()).parent().find('.carousel-caption');
          switch (event.data) {
            case -1:
              $(targetControl).fadeIn(500);
              $(targetControl).children().unbind('click');
              break;
            case 0:
              $(targetControl).fadeIn(500);
              $(targetControl).children().unbind('click');
              break;
            case 1:
              $(targetControl).children().click(function () {return false;});
              $(targetCaption).fadeOut(500);
              $(targetControl).fadeOut(500);
              break;
            case 2:
              $(targetControl).fadeIn(500);
              $(targetControl).children().unbind('click');
              break;
            case 3:
              $(targetControl).children().click(function () {return false;});
              $(targetCaption).fadeOut(500);
              $(targetControl).fadeOut(500);
              break;
            case 5:
              $(targetControl).children().click(function () {return false;});
              $(targetCaption).fadeOut(500);
              $(targetControl).fadeOut(500);
              break;
            default:
              break;
          }
        }
        // time out allows the dom to load
        $timeout(function () {
          onYouTubeIframeAPIReady();
        }, 0);

        $($window).bind('load', function () {
          $('.carousel-caption').fadeIn(500);
          $('.controls').fadeIn(500);
        });

        $('.carousel').bind('slid.bs.carousel', function () {
          $('.controls').fadeIn(500);
        });
      }
    };
  }
})();
