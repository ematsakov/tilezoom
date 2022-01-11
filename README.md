[Tilezoom](https://github.com/ematsakov/tilezoom)
========

TileZoom Plugin is an image zoom plugin which uses image tiles and provides a convenient way to zoom in and zoom out of high-resolution images.

Documentation
-----------
[Here](http://labs.webcodingstudio.com/tilezoom/docs.html) you can find more info about jQuery TileZoom Plugin.

Demos and Examples
-----------
+ [2 Dollars (7356 x 3146)](http://labs.webcodingstudio.com/tilezoom/2dollars.html)
+ [Mona Lisa (2835 x 4289)](http://labs.webcodingstudio.com/tilezoom/mona-lisa.html)

Try
-----------
On this [TileGenerator](http://labs.webcodingstudio.com/tilegenerator) demo page you can try to upload your own image and see jQuery TileZoom Plugin in action.

Download
-----------
Clone the repo, `git clone git://github.com/ematsakov/tilezoom.git`, or [download the latest release](https://github.com/ematsakov/tilezoom/zipball/master).

+ [jQuery TileZoom Plugin](http://labs.webcodingstudio.com/uploads/jquery/tilezoom.zip)
+ [Examples](http://labs.webcodingstudio.com/uploads/jquery/tilezoom_examples.zip)
+ [TileGenerator](http://labs.webcodingstudio.com/uploads/php/tilegenerator.zip)

== Changelog ==

= 1.2.1 - 2022-01-11 =
* Added centering when initial zoom image is bigger than container
* Added startTop and startLeft params

= 1.2 - 2015-12-02 =
* Various modernization and flexibility enhancements ( Thanks to Michaël Fortin )
* Mouse input is not disabled when a touchscreen is detected (mouse input didn’t work with Windows devices with seldom-used touchscreens).
* Using Hammer.js for more robust multi-touch input instead of dnaielglyde/TouchIt
* Added onZoom callback (called for each zoom step)
* Removed dependency on ES6 feature (yield, which didn’t bring much to the table anyway).

= 1.1.1 - 2014-02-04 =
* Added “initialized” callback which happens after tilezoom plugin has been fully initalized.

= 1.1 - 2012-10-11 =
* Add touch gesture support (jQuery required dependency:
https://github.com/danielglyde/TouchIt). Supports pinch to zoom in and
out, double tapping to zoom and tap dragging
* Add a gestures property and sets to false (just like mousewheel).
* Add dragBoundaries boolean to optionally turn off constraining image
to boundaries while dragging
* Add double-click to zoom-in
* Fix unbind the mousemove on mouse up
* Add public resize() method if the container resizes
* Fix issue where certain mousewheels (or trackpads) were giving a
non-interger based delta were causing it to scale the holder to an
un-even level (images would fail)
* Add optimization to not re-zoom if we’re already at the correct level
* Add CSS support for default navigation always showing with gestures on
Thanks to Matt Moore for all of these issues fixed.
* Fix issue “position: fixed;” on some Android 2.x devices.
