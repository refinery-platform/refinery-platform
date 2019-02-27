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

  rpVideoCarousel.$inject = ['_', '$timeout', '$window', 'YouTube', 'homeConfigService'];

  function rpVideoCarousel (_, $timeout, $window, YouTube, homeConfigService) {
    return {
      restrict: 'E',
      templateUrl: function () {
        return $window.getStaticUrl('partials/home/partials/video-carousel.html');
      },
      link: function (scope, elem) {
        // elem is the main carousel container
        var carouselDiv;
        var players = []; // list of video players

        /**
         * @name onYouTubeIframeAPIReady
         * @desc Private method for initializing the youtube players on startup
         * @memberOf refineryHome.rpVideoCarousel
        **/
        scope.onYouTubeIframeAPIReady = function () {
          carouselDiv = elem.find('#home-video-carousel');
          // The id of the iframe and is the same as the videoId
          elem.find('.youtube-video').each(function (i, obj) {
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
        };

        /**
         * @name navNext
         * @desc View method for scrolling the carousel right with the slide effect
         * @memberOf refineryHome.rpVideoCarousel
        **/
        scope.navNext = function () {
          carouselDiv.carousel('next').trigger('slide');
        };

        /**
         * @name navPrev
         * @desc View method for scrolling the carousel left with the slide effect
         * @memberOf refineryHome.rpVideoCarousel
        **/
        scope.navPrev = function () {
          carouselDiv.carousel('prev').trigger('slide');
        };

        /**
         * @name onPlayerStateChange
         * @desc Private method for trigger carousel effects when use plays video
         * @memberOf refineryHome.rpVideoCarousel
        **/
        function onPlayerStateChange (event) {
          var targetControl = angular.element(elem.find('.controls'));
          var targetVideo = elem.find(event.target.getIframe()).parent();
          var targetCaption = angular.element(targetVideo.find('.carousel-caption')[0]);

          if ([0, 2].includes(event.data)) { // ended, paused
            targetControl.fadeIn(500);
          } else if ([1, 3, 5].includes(event.data)) { // playing, buffering, cued
            targetCaption.fadeOut(500);
            targetControl.fadeOut(500);
          }
        }

        scope.$watchCollection(
          function () {
            return homeConfigService.homeConfig;
          },
          function (updatedHomeConfig) {
            scope.videoList = updatedHomeConfig.siteVideos;
          }
        );
      }
    };
  }
})();
