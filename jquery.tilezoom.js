/*
 * jQuery WCS Tile Zoom Plugin
 * Examples and documentation at: http://demo.webcodingstudio.com/tile-zoom/
 * Copyright (c) 2011 Evgeny Matsakov
 * Version: 1.2 (2-DEC-2015)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 * Requires: jQuery v1.2.6 or later
 */
(function($){

function debug(s) {
	$.fn.tilezoom.debug && log(s);
}		
function log() {
	window.console && console.log && console.log('[tilezoom] ' + Array.prototype.join.call(arguments,' '));
}
var methods = {
	init : function( options ) {
		var defaults = {
			width: null, // original image width in pixels. *(required) if no xml file
			height: null, // original image height in pixels *(required) if no xml file
			path: null, // tiles directory. *(required) if no xml file
			xml: null, // xml file with settings generated with Deep Zoom Tools
			tileSize: 254, // tile size in pixels
			overlap: 1, // tiles overlap
			thumb: 'thumb.jpg', // thumbnail filename
			format: 'jpg', // image format
			speed: 500, // animation speed (ms)
			easing: 'swing', // animation easing (jquery easing function name)
			mousewheel: false, // requires mousewheel event plugin: http://plugins.jquery.com/project/mousewheel
			gestures: false, // requires hammer.js event plugin, https://github.com/hammerjs/hammer.js
			zoomToCursor: true, // stay the same relative distance from the edge when zooming
			offset: '20%', //boundaries offset (px or %). If 0 image move side to side and up to down
			dragBoundaries: true, // If we should constrain the drag to the boundaries
			minZoomLevel: 0, // can't zoom out past level [minZoom]
			maxZoomLevel: 9999, // can't zoom in past level [maxZoom]
			wrapZoom: true, // If we're at the high level of resolution, go back to the start level
			beforeZoom: function($cont) {}, // callback before a zoom happens
			onZoom: function($cont, progress) {}, // callback for each zoom animation step
			afterZoom: function($cont) {}, // callback after zoom has completed
			callBefore: function($cont) {}, // this callback happens before dragging starts
			callAfter: function($cont, coords) {}, // this callback happens at end of drag after released "mouseup"
			initialized: function($cont) {}, // this callback happens after tilezoom  has been fully initalized.
			navigation: true, // navigation container ([true: show nav controls] or [false: don't show nav controls] or [DOM selector to insert controls in])
			zoomIn: null, // zoomIn button
			zoomOut: null, // zoomOut button
			goHome: null, // goHome button, reset to default state
			toggleFull: null // toggleFull button
		}
		
		// iterate the matched nodeset
		return this.each(function(index){
			if ( options.xml != null ) {
				var $cont = $(this);
				initOptionsFromXml(options.xml, options, function() {
					initTilezoom(defaults, options, $cont, index);
					//initialized callback
					if(typeof options.initialized == "function") {
						options.initialized($cont);
					}
				});
			}
			else {
				initTilezoom(defaults, options, $(this), index);
				//initialized callback
				if(typeof options.initialized == "function") {
					options.initialized($cont);
				}
			}		
		});
	},
	destroy : function( ) {
		return this.each(function(){
			var $cont = $(this),
			data = $cont.data('tilezoom');
			
			// Namespacing FTW
			$(window).unbind('.tilezoom');
			if(data) {
				data.tilezoom.remove();
			}
			$cont.html('');
			$cont.removeData('tilezoom');
		});
	},
	zoom : function( level, coords ) {
		return this.each(function(){
		
			var $cont = $(this);
			var settings = $cont.data('tilezoom.settings');
			if(settings.inAction) return false;
			
			if (level >= 9 && level >= settings.minZoomLevel && level <= settings.maxZoomLevel &&
				level < settings.numLevels && level != settings.level) {
				//beforeZoom callback
				if(typeof settings.beforeZoom == "function") {
					settings.beforeZoom($cont);
				}
				settings.level = level;
				$cont.data('tilezoom.settings', settings);
				initTiles($cont);
				setSizePosition($cont, coords, settings.speed, function() {
					checkTiles($cont);
					//afterZoom callback
					if(typeof settings.afterZoom == "function") {
						settings.afterZoom($cont);
					}
				});
			}
			else {
				return false;
			}
			
		});
	},
	reposition : function( ) {},
	show : function( ) {},
	hide : function( ) {},
	update : function( ) {},
	resize : function( ) {
		return this.each(function(){
			setSizePosition($(this), {}, 0);
		});
	}
};

$.fn.tilezoom = function( method ) {

	if ( methods[method] ) {
		return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
	} else if ( typeof method === 'object' || ! method ) {
		return methods.init.apply( this, arguments );
	} else {
		$.error( 'Method ' +  method + ' does not exist on jquery.tilezoom' );
	}    

};

//init Tilezoom
function initTilezoom(defaults, options, $cont, index) {
	var settings = $.extend({}, defaults, options);
	if ( settings.width == null ) {
		$.error( 'width is not specified' );
	}
	if ( settings.height == null ) {
		$.error( 'height is not specified' );
	}
	if ( settings.path == null ) {
		$.error( 'path to tiles directory is not specified' );
	}
	settings.userAgent = navigator.userAgent.toLowerCase();
	//save zoom element index
	settings.id = index;
	//set in action flag
	settings.inAction = false;
	//container
	settings.cont = $cont;	
	buildMarkup($cont, settings);
	buildOptions($cont, settings);
	initTiles($cont);
	initHotspots($cont);
	initNavigation($cont);
	setSizePosition($cont, coords={}, 0, function() {
		checkTiles($cont);
		var isTouchSupported = (typeof(window.ontouchstart) != 'undefined');
		if (isTouchSupported) {
		    initGestures($cont);
		} else {
		    initDraggable($cont);
		    initMousewheel($cont);
		}
	});

	// initialized callback
	if(typeof settings.initialized == "function") {
		settings.initialized($cont);
	}
}

//parse XML
function initOptionsFromXml(xml, options, callback) {	
	$.ajax({
		type: "GET",
		url: xml,
		dataType: "xml",
		success: function(data) {
			var $image = $(data).find('Image');
			options.tileSize = $image.attr('TileSize');
			options.overlap = $image.attr('Overlap');
			options.format = $image.attr('Format');
			var $size = $image.find('Size');
			options.width = $size.attr('Width');
			options.height = $size.attr('Height');
			options.path = xml.replace('.xml', '_files');
			if(typeof callback == "function") {
				callback();
			}
		}
	});
}

//build markup
function buildMarkup($cont, settings) {
	
	$cont.addClass('zoom-container');
	if(!$cont.children('div.zoom-holder').get(0)) {
		$cont.append('<div class="zoom-holder"></div>');
	}
	//holder
	var $holder = settings.holder = $cont.children('div.zoom-holder');
	
	//thumb
	var thumbPath = settings.path+'/'+settings.thumb;
	if(!$holder.children('img.zoom-thumb').get(0)) {
		$holder.prepend('<img src="'+thumbPath+'" class="zoom-thumb" />');
	}
	var $thumb = settings.thumb = $holder.children('img.zoom-thumb');
	
	//tiles container
	if(!$holder.children('div.zoom-tiles').get(0)) {
		$thumb.after('<div class="zoom-tiles"></div>');
	}
	var $tiles = settings.tiles = $holder.children('div.zoom-tiles');

	//hotspots container
	if(!$holder.children('div.zoom-hotspots').get(0)) {
		$tiles.after('<div class="zoom-hotspots"></div>');
	}
	var $hotspots = settings.hotspots = $holder.children('div.zoom-hotspots');
	$hotspots.addClass('grab');
	
	return settings;
}

// one-time initialization
function buildOptions($cont, settings) {
	settings.numLevels = initNumLevels(settings);
	if(settings.startLevel == undefined) {
		settings.startLevel = initLevel(settings);
	}
	settings.level = settings.startLevel;
	$cont.data('tilezoom.settings', settings);
}

function initNumLevels(settings) {
	var maxDimension = Math.max(settings.width, settings.height);
	var numLevels = parseInt(Math.ceil(Math.log(maxDimension/settings.tileSize)/Math.log(2)) + 1);
	return numLevels;
};

function initLevel(settings) {
	var level = 9;
	var $cont = settings.cont;
	var contWidth = $cont.width();
	var contHeight = $cont.height();
	while(9 <= level && level < settings.numLevels) {
		var levelImage = getImage(level, settings);
		if(levelImage.width>=contWidth || levelImage.height>=contHeight) {
			break;
		}
		level++;
	}
	return level-1;
};

function initTiles($cont, level) {
	var settings = $cont.data('tilezoom.settings');
	if (level == undefined) {
		level = settings.level;
	}
	var levelDir = settings.path+'/'+level;
	var tiles = getTiles(level, settings);
	var $tiles = settings.tiles;
	
	$tiles.html('');
	
	$.each(tiles, function(index, tile) {
		var src = levelDir+'/'+tile[0]+'_'+tile[1]+'.'+settings.format;
		var offsetX = tile[0] == 0 ? 0 : settings.overlap;
		var offsetY = tile[1] == 0 ? 0 : settings.overlap;
		var id = 'zoom-'+settings.id+'-tile-'+tile[0]+'-'+tile[1];
		var style = 'position: absolute; left: '+(tile[0]*settings.tileSize-offsetX)+'px; top: '+(tile[1]*settings.tileSize-offsetY)+'px; z-index: 0;';
		$('<img/>', {
			_src: src,
			id: id,
			style: style
		}).appendTo($tiles);
	});
}

function getImage(level, settings) {
	var dimension = getDimension(level, settings);
	return dimension;
};

function getDimension(level, settings) {
	if(0 <= level && level < settings.numLevels) {
		var scale = getScale(level, settings);
		var dimension = {};
		dimension.width = parseInt(Math.ceil(settings.width * scale));
		dimension.height = parseInt(Math.ceil(settings.height * scale));
		return dimension;
	}
	else {
		throw 'Invalid pyramid level';
	}
};

function getScale(level, settings) {
	if(0 <= level && level < settings.numLevels) {
		var maxLevel = settings.numLevels - 1;
		return Math.pow(0.5, maxLevel - level);
	}
	else {
		throw 'Invalid pyramid level (scale)';
	}
};

function getTiles(level, settings) {
	var cells = getNumTiles(level, settings);
	var array = [];
	
	for (row=0;row<=(cells.rows-1);row++) {
		for (column=0;column<=(cells.columns-1);column++) {
			 array.push(new Array(column,row));
		}
	}
	return array;
}

function getNumTiles(level, settings) {
	if(0 <= level && level < settings.numLevels) {
		var dimension = getDimension(level, settings);
		var cells = {};
		cells.columns = parseInt(Math.ceil(parseFloat(dimension.width) / settings.tileSize));
		cells.rows = parseInt(Math.ceil(parseFloat(dimension.height) / settings.tileSize));
		return cells;
	}
	else {
		throw "Invalid pyramid level (numTiles)";
	}
}

function checkTiles($cont) {
	var settings = $cont.data('tilezoom.settings');
	var visibleTiles = getVisibleTiles($cont);
	$.each(visibleTiles, function(index, visibleTile) {
		var id = 'zoom-'+settings.id+'-tile-'+visibleTile[0]+'-'+visibleTile[1];
		var $img = $('#'+id);
		if($img.get(0)) {
			var src = $img.attr('src');
			if(!src) {
				var _src = $img.attr('_src');
				$img.attr('src', _src);
			}
		}
	});
}

function getVisibleTiles($cont) {
	var settings = $cont.data('tilezoom.settings');
	var $holder = settings.holder;
	
	var mapX = parseInt($holder.css('left')); 
	var mapY = parseInt($holder.css('top'));
	var viewportWidth = $cont.width();
	var viewportHeight = $cont.height();
	var startX = Math.abs(Math.floor(mapX / settings.tileSize)) - 2; 
	var startY = Math.abs(Math.floor(mapY / settings.tileSize)) -1; 
	var tilesX = Math.ceil(viewportWidth / settings.tileSize) +2; 
	var tilesY = Math.ceil(viewportHeight / settings.tileSize) +1; 
	var visibleTileArray = []; var counter = 0;
	for (x = startX; x < (tilesX + startX); x++) {
		for (y = startY; y < (tilesY + startY); y++) {
			if (x>=0 && y>=0) {
				visibleTileArray[counter++] = [x, y];
			}
		}
	}
	return visibleTileArray;
}

/*
* Init Draggable funtionality
*/

function initDraggable($cont) {
	
	var settings = $cont.data('tilezoom.settings');
	var $holder = settings.holder;
	var $hotspots = settings.hotspots;
	
	var dragging = false;
	var startLeft = 0;
	var startTop = 0;
	
	$holder.unbind('mousedown');
	$holder.unbind('mousemove');
	
	$holder.mousedown(function(e) {
		if(settings.inAction) return false;
		$holder.stop(true,true);
		$hotspots.removeClass('grab').addClass('grabbing');
		dragging = true;
		startLeft = parseInt($holder.css('left'));
		startTop = parseInt($holder.css('top'));
		var startX = e.pageX;
		var startY = e.pageY;
		var pos = {};	
		//callBefore callback
		if(typeof settings.callBefore == "function") {
			settings.callBefore($cont);
		}
		$(document).unbind("mousemove");
		$(document).mousemove(function (e) {
			if(dragging){
				var offsetX =  e.pageX - startX;
				var offsetY =  e.pageY - startY;
				pos.left = startLeft+offsetX;
				pos.top = startTop+offsetY;
				if (settings.dragBoundaries){
					checkBoundaries($cont, pos);
				}
				$holder.css({'left': pos.left, 'top': pos.top});
			}
		});
		
		$(document).one('mouseup', function () {
			$(document).unbind("mousemove");
			$hotspots.removeClass('grabbing').addClass('grab');		
			dragging = false;
			checkTiles($cont);
			//callAfter callback
			if(typeof settings.callAfter == "function") {
				settings.callAfter($cont, {'startLeft':startLeft, 'startTop':startTop, 'endLeft':pos.left, 'endTop':pos.top});
			}
		});
		return false;
	});
}

/*
* Init Mousewheel zoom
*/
function initMousewheel($cont) {
	var settings = $cont.data('tilezoom.settings');
	
	if(settings.mousewheel && typeof $.fn.mousewheel != "undefined") {
		$cont.unbind('mousewheel');
		$cont.mousewheel(function(e, delta) {
			var coords = {};
			if(settings.zoomToCursor) {
				coords.x = e.pageX;
				coords.y = e.pageY;
			}
			var level = Math.round(settings.level + delta);
			$cont.tilezoom('zoom', level, coords);
			return false;//don't scroll the window
		});
	}
}

/*
* Init Hotspots clicks
*/
function initHotspots($cont) {
	var settings = $cont.data('tilezoom.settings');
	var $hotspots = settings.hotspots;
	var $holder = settings.holder;
	
	$hotspots.children().click(function (event) {
		event.preventDefault();
		var $hotspot = $(this);
		
		if($hotspot.hasClass('active')) {
			var level = settings.startLevel;
			$hotspots.children().removeClass('active');
		}
		else {
			var level = parseInt($hotspot.attr('rel'));
			if(isNaN(level)) level = settings.startLevel+1;
			$hotspots.children().removeClass('active');
			$hotspot.addClass('active');
		}
		
		var coords = {};
		var left = this.style.left;
		if(!left) left = $hotspot.css('left');
		var top = this.style.top;
		if(!top) top = $hotspot.css('top');
		if(left.indexOf('%')!==-1) {
			left = parseInt(parseFloat(left)*$holder.width()/100);
		}
		if(top.indexOf('%')!==-1) {
			top = parseInt(parseFloat(top)*$holder.height()/100);
		}
		coords.left = left;
		coords.top = top;
		
		$cont.tilezoom('zoom', level, coords);	
	});
}

function initGestures($cont) {
	
	var settings = $cont.data('tilezoom.settings');
	var $holder = settings.holder;

	if(settings.gestures && typeof Hammer != "undefined") {
		// gestures don't affect inside the container
		$cont.bind('touchmove', function(e){
			e.preventDefault();
		});
		$cont.addClass('gestures');
		
		var dragging = false;
		var startLeft = 0;
		var startTop = 0;
		var startLevel = settings.level;
		var pos;

		var manager = new Hammer.Manager($holder[0], { preventDefault: true });

	    manager.add(new Hammer.Pinch({ threshold: 0.1 }));
	    manager.add(new Hammer.Pan({ direction: Hammer.DIRECTION_ALL }));
		
	    manager.on("panstart", function () {
		    if (settings.inAction) return false;
			$holder.stop(true, true);
			dragging = true;
			startLeft = parseInt($holder.css('left'));
			startTop = parseInt($holder.css('top'));
			startLevel = settings.level;
			if (typeof settings.callBefore == "function") {
				settings.callBefore($cont);
			}
		});

	    manager.on("panmove", function (ev) {
	        if (!dragging) return;
	        if (!pos) pos = {};
			pos.left = startLeft + ev.deltaX;
			pos.top = startTop + ev.deltaY;
			if (settings.dragBoundaries) {
				checkBoundaries($cont, pos);
			}
			$holder.css({ 'left': pos.left, 'top': pos.top });
		});

	    manager.on("panend", function () {
	        if (!pos) return;
		    dragging = false;
			checkTiles($cont);
			//callAfter callback
			if (typeof settings.callAfter == "function") {
				settings.callAfter($cont, { 'startLeft': startLeft, 'startTop': startTop, 'endLeft': pos.left, 'endTop': pos.top });
			}
		});

	    manager.on("pinch", function (ev) {
			dragging = false;
			var scale = ev.scale;
			var level = (scale > 1) ?
				startLevel + Math.floor(scale) :
				startLevel - Math.floor(1 / scale);
			$cont.tilezoom('zoom', level, {});
		});
	}
}

/*
* Init Navigation
*/
function initNavigation($cont) {
	var settings = $cont.data('tilezoom.settings');
	
	if(settings.navigation==true) {
		if(!$cont.children('div.zoom-navigation').get(0)) {
			$cont.append('<div class="zoom-navigation"></div>');
		}
		//navigation
		var $nav = settings.nav = $cont.children('div.zoom-navigation');
	}
	else if(settings.navigation != false && settings.navigation != null) {
		var $nav = settings.nav = $(settings.navigation);
	}
	
	if($nav && $nav.get(0)) {
		//zoomIn button
		if(!$nav.children('a.zoom-in').get(0)) {
			$nav.append('<a class="zoom-in" href="#" title="Zoom in">Zoom In</a>');
		}
		settings.zoomIn = $nav.children('a.zoom-in');
		
		//zoomOut button
		if(!$nav.children('a.zoom-out').get(0)) {
			$nav.append('<a class="zoom-out" href="#" title="Zoom Out">Zoom Out</a>');
		}
		settings.zoomOut = $nav.children('a.zoom-out');
		
		//goHome button
		if(!$nav.children('a.go-home').get(0)) {
			$nav.append('<a class="go-home" href="#" title="Go Home">Go Home</a>');
		}
		settings.goHome = $nav.children('a.go-home');
		
		//toggleFull button
		if(!$nav.children('a.toggle-full').get(0)) {
			$nav.append('<a class="toggle-full" href="#" title="Toggle Full Page">Toggle Full Page</a>');
		}
		settings.toggleFull = $nav.children('a.toggle-full');
	}
	
	//init zoomIn button
	$(settings.zoomIn).unbind('click');
	$(settings.zoomIn).click(function() {
		var settings = $cont.data('tilezoom.settings');
		var level = settings.level+1;
		$cont.tilezoom('zoom', level, {});
		return false;
	});
	
	//init zoomOut button
	$(settings.zoomOut).unbind('click');
	$(settings.zoomOut).click(function() {
		var settings = $cont.data('tilezoom.settings');
		var level = settings.level-1;
		$cont.tilezoom('zoom', level, {});
		return false;
	});
	
	//init goHome button
	$(settings.goHome).unbind('click');
	$(settings.goHome).click(function() {
		var settings = $cont.data('tilezoom.settings');
		var $hotspots = settings.hotspots;
		$hotspots.children().removeClass('active');
		var level = settings.startLevel;
		$cont.tilezoom('zoom', level, {});
		return false;
	});
	
	//init toggleFull button
	$(settings.toggleFull).unbind('click');
	$(settings.toggleFull).click(function() {
		var onFullScreen = function(e){
			if (e.keyCode == 27) { // esc
				$(settings.toggleFull).click(); 
			}
		}
		if(settings.userAgent.indexOf("android") > -1) {
			var positionStyle = 'absolute';
		}
		else {
			var positionStyle = 'fixed';
		}
		if ($(this).hasClass('toggle-full-close')){
			$cont.css('position', 'relative');
			$(this).removeClass('toggle-full-close');
			$(document).unbind("keyup", onFullScreen);
		} else {
			$cont.css('position', positionStyle);
			$(this).addClass('toggle-full-close');
			$(document).keyup(onFullScreen);
		}
		$cont.toggleClass('zoom-full');
		coords = {};
		setSizePosition($cont, coords, 0);
		return false;
	});
}

/*
* Main size and position handler
*/
function setSizePosition($cont, coords ,speed, callback) {
	var settings = $cont.data('tilezoom.settings');
	settings.inAction = true;
	$cont.data('tilezoom.settings', settings);
	
	var $holder = settings.holder;
	var $thumb = settings.thumb;
	var $tiles = settings.tiles;
	var $hotspots = settings.hotspots;
	
	//size
	var levelImage = getImage(settings.level, settings);
	
	//position
	var pos = {};
	var ratio = parseFloat(levelImage.width/$holder.width());
	var left = parseInt($holder.css('left'));
	var top = parseInt($holder.css('top'));
	
	//move center to coord ( hotspot click )
	if(coords.left) {
		var left = levelImage.width / $holder.width() * parseFloat(coords.left);
		pos.left = parseInt($cont.width() / 2) - left;
	}
	//relative center to the event coords ( mousewheel zoom )
	else if(coords.x){
		var positionLeft = coords.x - $holder.offset().left;
		var relativeLeft = coords.x - $cont.offset().left;
		var percentLeft = positionLeft / $holder.width();
		pos.left = parseInt(relativeLeft-levelImage.width * percentLeft);
	}
	//move center to current center ( + - zoom )
	else {
		var centerX = parseInt($cont.width()/2) - left;
		pos.left = -parseInt(($cont.width() / -2 ) + centerX * ratio);
	}
	
	//move center to coord ( hotspot click )
	if(coords.top) {
		var top = levelImage.height / $holder.height() * parseFloat(coords.top);
		pos.top = parseInt($cont.height() / 2) - top;
	}
	//relative center to the event coords ( mousewheel zoom )
	else if(coords.y){
		var positionTop = coords.y - $holder.offset().top;
		var relativeTop = coords.y - $cont.offset().top;
		var percentTop = positionTop / $holder.height();
		pos.top = parseInt(relativeTop-levelImage.height * percentTop);
	}
	//move center to current center ( + - zoom )
	else {
		var centerY = parseInt($cont.height()/2) - top;
		pos.top = -parseInt(($cont.height() / -2 ) + centerY * ratio);
	}
	
	checkBoundaries($cont, pos);
	
	var styles = {
		'width': levelImage.width,
		'height': levelImage.height
	}
	
	//apply styles
	$tiles.hide();
	$tiles.css(styles);

	$holder.stop(true,true).animate({
		'width': levelImage.width,
		'height': levelImage.height,
		'left': pos.left,
		'top': pos.top
	}, {
		duration: speed,
		easing: settings.easing,
		progress: function(animation, progress) {
			settings.onZoom($cont, progress);
		}
	});
	
	$hotspots.stop(true, true).animate(styles, speed, settings.easing);
	$thumb.stop(true, true).animate(styles, speed, settings.easing, function () {
		$tiles.fadeIn(speed);
		if (typeof callback == "function") callback();
		settings.inAction = false;
		$cont.data('tilezoom.settings', settings);
	});
};

/*
* Limit holder position by container boundaries
*/
function checkBoundaries($cont, pos) {	
	var settings = $cont.data('tilezoom.settings');
	var level = settings.level;
	var levelImage = getImage(level, settings);
	var contWidth = $cont.width();
	var contHeight = $cont.height();
	var boundaryOffset = {'x':settings.offset,'y':settings.offset};
	//if offset set in persantage
	if(settings.offset.indexOf('%')!==-1) {
		boundaryOffset.x = contWidth*parseInt(settings.offset)/100;
		boundaryOffset.y = contHeight*parseInt(settings.offset)/100;
	}
	
	//log("boundaryOffset ["+boundaryOffset.x+", "+boundaryOffset.y+"]");
	
	//boundaries
	var minLeft = contWidth-levelImage.width-boundaryOffset.x;
	var minTop = contHeight-levelImage.height-boundaryOffset.y;
	
	if(pos.left<minLeft || isNaN(pos.left)) pos.left = minLeft;
	if(pos.top<minTop || isNaN(pos.top)) pos.top = minTop;
	
	if(pos.left>=boundaryOffset.x) pos.left = boundaryOffset.x;
	if(pos.top>=boundaryOffset.y) pos.top = boundaryOffset.y;
	
	if(levelImage.width<=contWidth) {
		//move to center of container
		pos.left = parseInt((contWidth-levelImage.width)/2);
	}
	if(levelImage.height<=contHeight) {
		//move to center of container
		pos.top = parseInt((contHeight-levelImage.height)/2);
	}
	
	//log("pos [top:"+pos.top+", left:"+pos.left+"]");
	
	return pos;
}
	
})(jQuery);
