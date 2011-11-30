/*!
 * Zoom jQuery Plugin
 * http://jquery.com/
 *
 * Author: Serge Krul
 * Company: netcraft
 * Site: http://netcraft.co.il
 *
 * Copyright 2011, Netcraft
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 * Zooms full pages.
 *
 * To use:
 * Put an iframe on the page, in some container,
 * and do:
 *
 *	iframe.one("load", function() {
 *									
 *		iframe.zoomer({
 *			ratio: 0.4,
 *			previewWidth: 431,
 *			previewHeight: 925
 *		});					
 *	});
 *
 * Date:	Tue Apr 05 15:52:53 2011
 * Updated:	Thr Jun 02 13:38:45 2011
 *
 */

(function ($) {
	
	$.fn.zoomer = function (options) {

        // Defaults:
        var settings = {
		            			
			ratio: 0.4,
			previewWidth: 431,
			previewHeight: 497,
			
			// An option to manually set height for a cross-domain iframe
			// cause we can't read it with js
			contentHeight: null,

			// Webkit also implements Microsoft's zoom,
			// so you have an option to use it instead of the transform scale.
			// Doesn't work for Cross-Domain preview (fallbacks to scale).
			webkitZoom: true,
			
			// Unfortunately Chromes' mood changes between versions.
			// Fortunately (hopefully) we know what to do when it does.
			// If the preview looks weird in Chrome just change this to anything else and pray.
			// If it still looks weird you didn't guess it right. Right.
			chromesMood: ":)",
			
			// Gives the option to force direction:
			// affects offsets directions (margin and transform-origin)
			forceDirection: null, // "ltr" || "rtl"			
			
			className: "zoom",
			container: null
        };

		// Some ugly browser detection:
		var version = parseFloat($.browser.version);
				
		var browser = {			
			ie: $.browser.msie,
			ie7: $.browser.msie && version === 7,
			ie8: $.browser.msie && version === 8,
			ie9: $.browser.msie && version === 9,			
			chrome: ($.browser.webkit || $.browser.safari) && navigator.userAgent.indexOf("Chrome") != -1 && version > 534.14
		};
		// Safari's and Chrome's Webkit are not the same..
		browser.safari = $.browser.safari && !browser.chrome;		
		if (browser.safari) {
			// Safari's zoom looks ugly..
			settings.webkitZoom = false;
		}

		// Check if we can access iframe contents for getting its height
		function canAccess (iframe) {

			var height;
			try {
				height = iframe.contents().height();				
			} catch (e) {}
			return height === 0 || !!height;
		}

		function initContainer (iframe) {

			var container = settings.container ? 
					iframe.closest(settings.container) : iframe.parent();
			
			container.addClass(settings.className);
			container.css({
				"width": settings.previewWidth,
				"height": settings.previewHeight,
				"overflow": "hidden"
			});
			settings.container = container;
		}

		function zoom (iframe) {
			
			setValues(iframe, calc(iframe));
		}		

		// The "magic" func (more like a miracle..)
		function calc (iframe) {			
			
			var ratio = settings.ratio, // The ratio by which we zoom
				contentHeight = settings.contentHeight, // Actual document height before zoom				
				val = {
					height		: 0,	// Formula to make the window full height after zoom
					width		: 0,	// Formula to make the window full width after zoom
					offsetTop	: 0,	// Formula to make the window start vertically from where it was before zoom
					offsetLeft	: 0		// Formula to make the window start horizontally from where it was before zoom
				},
				calcStandard = function () {
					
					// The right way (?): Mozilla, Opera, Safari
					// Other browser may depend on these values too
					val.height = contentHeight;
					val.width = ((1 / ratio) * 100) + "%";

					// Calculate the offsets, redundant when using transform-origin
					val.offsetTop = -((1 - ratio) / 2) * contentHeight;
					val.offsetLeft = -(100 - ((1 / ratio) * 10));
				},
				calcChrome = function () {
					
					var mood;
					
					// When using zoom instead of scale
					if (canAccess && settings.webkitZoom) {
						val.height = "100%";
						val.width = "100%";
					} else {
						// Chromes'	(moody) way to do transform scale
						mood = settings.chromesMood === ":)" ? ratio : ratio * ratio;
						val = {
							height	: val.height / ratio,
							width	: ((1 / mood) * 100) + "%",
				
							// Calculate the offsets, redundant when using transform-origin
							offsetTop	: val.offsetTop / ratio,
							offsetLeft	: val.offsetLeft / ratio
						};
					}
				},
				calcIE = function () {
					
					// And.. the IE way! Actually very intuitive this time, 
					// with the oldest (IE7) being the most simple - doesn't need anything except "zoom"!
					if (browser.ie7) {
						val.height = "100%";
						val.width = "100%";
					}

					if (browser.ie8) {
						val.height = contentHeight * (1 / ratio);
						val.width = ((1 / (ratio * ratio)) * 100) + "%";
					}
								
					if (browser.ie9) {
						val.width = ((1 / ratio) * 100) + "%";
					}

					// Don't need any offset
					val.offsetTop = 0;
					val.offsetLeft = 0;
				};
			
			calcStandard();
			if (browser.chrome) { calcChrome(); }
			if (browser.ie) { calcIE(); }
			return val;
		}		

		// Lets apply our findings..
		function setValues (iframe, values) {
			
			var css = {
					"width": values.width,
					"height": values.height
				},
				ratio = settings.ratio,
				direction = function () {
					var dir = settings.forceDirection || settings.container.css("direction"),
						rtl = dir === "rtl";
					return {
						getProperty: function (prop) {
							var d = rtl ? "right" : "left";
							return prop + "-" + d;
						},
						sign: rtl ? -1 : 1,
						transformOrigin: rtl ? "100% 0" : "0 0"
					}
				}(),				
				setIE = function () {
					$.extend(css, {
						"zoom": ratio,						
						"margin-top": values.offsetTop
					});
					css[direction.getProperty("margin")] = (direction.sign * values.offsetLeft) + "%",
					iframe.css(css);
				},
				setChrome = function () {
					if (canAccess && settings.webkitZoom) {
						// The width/height should be applied to the iframe
						iframe.css(css);
						// But the zoom to the iframes root element
						iframe.contents().find("html").css("zoom", ratio);
					} else {
						$.extend(css ,{
							"-webkit-transform": "scale(" + ratio + ")",
							"-webkit-transform-origin": direction.transformOrigin
						});
						iframe.css(css);
					}
				},
				setStandard = function () {
					$.extend(css ,{
						"-moz-transform": "scale(" + ratio + ")",
						"-moz-transform-origin": direction.transformOrigin,
						"-o-transform": "scale(" + ratio + ")",
						"-o-transform-origin": direction.transformOrigin,
						"-webkit-transform": "scale(" + ratio + ")",
						"-webkit-transform-origin": direction.transformOrigin,
						"transform": "scale(" + ratio + ")",
						"transform-origin": direction.transformOrigin
					});
					iframe.css(css);
				};
			
			if (browser.ie) { setIE(); }
			else if (browser.chrome) { setChrome(); } 
			else { setStandard(); }			
		}

		// Hack for IE7 (otherwise, the preview will not be rendered until a mouse over)
		function ie7wake (iframe) {

			if (browser.ie7) {
				iframe = $(iframe);

				// Don't run over existing CSS
				var style = iframe.attr("style") || "";
				iframe.css("visibility", "hidden");
				iframe.css("visibility", "visible");			

				iframe.attr("style", style);
			}
		}

		// Plugin code, return jQuery collection
        return this.each(function () {
            
			if (options) {
                $.extend(settings, options);
            }

			var iframe = $(this);
			
			//Check cross-domain and keep result
			canAccess = canAccess(iframe);
			
			// Get the content height
			if (!settings.contentHeight && canAccess) {
				settings.contentHeight = iframe.contents().height();
			}
			if (settings.contentHeight) {
				initContainer(iframe);
				zoom(iframe);
				ie7wake(iframe);
			}

        }); // return

    }; // zoomer

})(jQuery);