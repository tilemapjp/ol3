// FIXME recheck layer/map projection compatability when projection changes
// FIXME layer renderers should skip when they can't reproject
// FIXME add tilt and height?

goog.provide('ol.Map');
goog.provide('ol.MapProperty');
goog.provide('ol.RendererHint');
goog.provide('ol.RendererHints');

goog.require('goog.Uri.QueryData');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.async.AnimationDelay');
goog.require('goog.async.Delay');
goog.require('goog.dispose');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.dom.ViewportSizeMonitor');
goog.require('goog.events');
goog.require('goog.events.BrowserEvent');
goog.require('goog.events.Event');
goog.require('goog.events.EventType');
goog.require('goog.events.KeyHandler');
goog.require('goog.events.KeyHandler.EventType');
goog.require('goog.events.MouseWheelHandler');
goog.require('goog.events.MouseWheelHandler.EventType');
goog.require('goog.object');
goog.require('goog.style');
goog.require('goog.vec.Mat4');
goog.require('ol.BrowserFeature');
goog.require('ol.Collection');
goog.require('ol.Color');
goog.require('ol.Extent');
goog.require('ol.FrameState');
goog.require('ol.IView');
goog.require('ol.MapBrowserEvent');
goog.require('ol.MapBrowserEvent.EventType');
goog.require('ol.MapBrowserEventHandler');
goog.require('ol.MapEvent');
goog.require('ol.MapEventType');
goog.require('ol.Object');
goog.require('ol.ObjectEventType');
goog.require('ol.Pixel');
goog.require('ol.PostRenderFunction');
goog.require('ol.PreRenderFunction');
goog.require('ol.Size');
goog.require('ol.Tile');
goog.require('ol.TileQueue');
goog.require('ol.View');
goog.require('ol.View2D');
goog.require('ol.ViewHint');
goog.require('ol.control.defaults');
goog.require('ol.interaction.defaults');
goog.require('ol.layer.Layer');
goog.require('ol.projection');
goog.require('ol.projection.addCommonProjections');
goog.require('ol.renderer.Map');
goog.require('ol.renderer.canvas.Map');
goog.require('ol.renderer.canvas.SUPPORTED');
goog.require('ol.renderer.dom.Map');
goog.require('ol.renderer.dom.SUPPORTED');
goog.require('ol.renderer.webgl.Map');
goog.require('ol.renderer.webgl.SUPPORTED');
goog.require('ol.structs.PriorityQueue');
goog.require('ol.vec.Mat4');


/**
 * @define {boolean} Whether to enable canvas.
 */
ol.ENABLE_CANVAS = true;


/**
 * @define {boolean} Whether to enable DOM.
 */
ol.ENABLE_DOM = true;


/**
 * @define {boolean} Whether to enable WebGL.
 */
ol.ENABLE_WEBGL = true;


/**
 * @enum {string}
 */
ol.RendererHint = {
  CANVAS: 'canvas',
  DOM: 'dom',
  WEBGL: 'webgl'
};


/**
 * @type {Array.<ol.RendererHint>}
 */
ol.DEFAULT_RENDERER_HINTS = [
  ol.RendererHint.WEBGL,
  ol.RendererHint.CANVAS,
  ol.RendererHint.DOM
];


/**
 * @enum {string}
 */
ol.MapProperty = {
  BACKGROUND_COLOR: 'backgroundColor',
  LAYERS: 'layers',
  SIZE: 'size',
  VIEW: 'view'
};



/**
 * @class
 * The map is the core component of OpenLayers. In its minimal configuration it
 * needs a view, one or more layers, and a target container:
 *
 *     var map = new ol.Map({
 *       view: new ol.View2D({
 *         center: [0, 0],
 *         zoom: 1
 *       }),
 *       layers: [
 *         new ol.layer.TileLayer({
 *           source: new ol.source.MapQuestOSM()
 *         })
 *       ],
 *       target: 'map'
 *     });
 *
 * The above snippet creates a map with a MapQuest OSM layer on a 2D view and
 * renders it to a DOM element with the id 'map'.
 *
 * @constructor
 * @extends {ol.Object}
 * @param {ol.MapOptions} options Map options.
 */
ol.Map = function(options) {

  goog.base(this);

  var optionsInternal = ol.Map.createOptionsInternal(options);

  /**
   * @private
   * @type {goog.async.AnimationDelay}
   */
  this.animationDelay_ =
      new goog.async.AnimationDelay(this.renderFrame_, undefined, this);
  this.registerDisposable(this.animationDelay_);

  /**
   * @private
   * @type {goog.vec.Mat4.Number}
   */
  this.coordinateToPixelMatrix_ = goog.vec.Mat4.createNumber();

  /**
   * @private
   * @type {goog.vec.Mat4.Number}
   */
  this.pixelToCoordinateMatrix_ = goog.vec.Mat4.createNumber();

  /**
   * @private
   * @type {?ol.FrameState}
   */
  this.frameState_ = null;

  /**
   * @private
   * @type {number}
   */
  this.freezeRenderingCount_ = 0;

  /**
   * @private
   * @type {boolean}
   */
  this.dirty_ = false;

  /**
   * @private
   * @type {Element}
   */
  this.target_ = optionsInternal.target;

  /**
   * @private
   * @type {?number}
   */
  this.viewPropertyListenerKey_ = null;

  /**
   * @private
   * @type {Element}
   */
  this.viewport_ = goog.dom.createDom(goog.dom.TagName.DIV, 'ol-viewport');
  this.viewport_.style.position = 'relative';
  this.viewport_.style.overflow = 'hidden';
  this.viewport_.style.width = '100%';
  this.viewport_.style.height = '100%';
  // prevent page zoom on IE >= 10 browsers
  this.viewport_.style.msTouchAction = 'none';
  goog.dom.appendChild(this.target_, this.viewport_);

  /**
   * @private
   * @type {Element}
   */
  this.overlayContainer_ = goog.dom.createDom(goog.dom.TagName.DIV,
      'ol-overlaycontainer');
  goog.events.listen(this.overlayContainer_, [
    goog.events.EventType.CLICK,
    goog.events.EventType.DBLCLICK,
    ol.BrowserFeature.HAS_TOUCH ?
        goog.events.EventType.TOUCHSTART : goog.events.EventType.MOUSEDOWN
  ], goog.events.Event.stopPropagation);
  goog.dom.appendChild(this.viewport_, this.overlayContainer_);

  var mapBrowserEventHandler = new ol.MapBrowserEventHandler(this);
  goog.events.listen(mapBrowserEventHandler,
      goog.object.getValues(ol.MapBrowserEvent.EventType),
      this.handleMapBrowserEvent, false, this);
  this.registerDisposable(mapBrowserEventHandler);

  // FIXME we probably shouldn't listen on document...
  var keyHandler = new goog.events.KeyHandler(goog.global.document);
  goog.events.listen(keyHandler, goog.events.KeyHandler.EventType.KEY,
      this.handleBrowserEvent, false, this);
  this.registerDisposable(keyHandler);

  var mouseWheelHandler = new goog.events.MouseWheelHandler(this.viewport_);
  goog.events.listen(mouseWheelHandler,
      goog.events.MouseWheelHandler.EventType.MOUSEWHEEL,
      this.handleBrowserEvent, false, this);
  this.registerDisposable(mouseWheelHandler);

  /**
   * @type {ol.Collection}
   * @private
   */
  this.interactions_ = optionsInternal.interactions;

  /**
   * @type {ol.renderer.Map}
   * @private
   */
  this.renderer_ =
      new optionsInternal.rendererConstructor(this.viewport_, this);
  this.registerDisposable(this.renderer_);

  /**
   * @private
   */
  this.viewportSizeMonitor_ = new goog.dom.ViewportSizeMonitor();

  goog.events.listen(this.viewportSizeMonitor_, goog.events.EventType.RESIZE,
      this.updateSize, false, this);

  /**
   * @private
   * @type {ol.Coordinate}
   */
  this.focus_ = null;

  /**
   * @private
   * @type {Array.<ol.PreRenderFunction>}
   */
  this.preRenderFunctions_ = [];

  /**
   * @private
   * @type {Array.<ol.PostRenderFunction>}
   */
  this.postRenderFunctions_ = [];

  /**
   * @private
   * @type {goog.async.Delay}
   */
  this.postRenderDelay_ = new goog.async.Delay(this.handlePostRender, 0, this);

  /**
   * @private
   * @type {ol.TileQueue}
   */
  this.tileQueue_ = new ol.TileQueue(
      goog.bind(this.getTilePriority, this),
      goog.bind(this.handleTileChange_, this));

  goog.events.listen(this, ol.Object.getChangedEventType(ol.MapProperty.VIEW),
      this.handleViewChanged_, false, this);
  goog.events.listen(this, ol.Object.getChangedEventType(ol.MapProperty.SIZE),
      this.handleSizeChanged_, false, this);
  goog.events.listen(
      this, ol.Object.getChangedEventType(ol.MapProperty.BACKGROUND_COLOR),
      this.handleBackgroundColorChanged_, false, this);
  this.setValues(optionsInternal.values);

  // this gives the map an initial size
  this.updateSize();

  if (goog.isDef(optionsInternal.controls)) {
    goog.array.forEach(optionsInternal.controls,
        /**
         * @param {ol.control.Control} control Control.
         */
        function(control) {
          control.setMap(this);
        }, this);
  }

};
goog.inherits(ol.Map, ol.Object);


/**
 * @param {ol.layer.Layer} layer Layer.
 */
ol.Map.prototype.addLayer = function(layer) {
  var layers = this.getLayers();
  goog.asserts.assert(goog.isDef(layers));
  layers.push(layer);
};


/**
 * @param {ol.PreRenderFunction} preRenderFunction Pre-render function.
 */
ol.Map.prototype.addPreRenderFunction = function(preRenderFunction) {
  this.requestRenderFrame();
  this.preRenderFunctions_.push(preRenderFunction);
};


/**
 * @param {Array.<ol.PreRenderFunction>} preRenderFunctions
 *     Pre-render functions.
 */
ol.Map.prototype.addPreRenderFunctions = function(preRenderFunctions) {
  this.requestRenderFrame();
  Array.prototype.push.apply(
      this.preRenderFunctions_, preRenderFunctions);
};


/**
 * @param {ol.PreRenderFunction} preRenderFunction Pre-render function.
 * @return {boolean} Whether the preRenderFunction has been found and removed.
 */
ol.Map.prototype.removePreRenderFunction = function(preRenderFunction) {
  return goog.array.remove(this.preRenderFunctions_, preRenderFunction);
};


/**
 *
 * @inheritDoc
 */
ol.Map.prototype.disposeInternal = function() {
  goog.dom.removeNode(this.viewport_);
  goog.dispose(this.postRenderDelay_);
  goog.base(this, 'disposeInternal');
};


/**
 * Freeze rendering.
 */
ol.Map.prototype.freezeRendering = function() {
  ++this.freezeRenderingCount_;
};


/**
 * @return {ol.Color|undefined} Background color.
 */
ol.Map.prototype.getBackgroundColor = function() {
  return /** @type {ol.Color|undefined} */ (
      this.get(ol.MapProperty.BACKGROUND_COLOR));
};
goog.exportProperty(
    ol.Map.prototype,
    'getBackgroundColor',
    ol.Map.prototype.getBackgroundColor);


/**
 * @return {ol.renderer.Map} Renderer.
 */
ol.Map.prototype.getRenderer = function() {
  return this.renderer_;
};


/**
 * @return {Element} Container.
 */
ol.Map.prototype.getTarget = function() {
  return this.target_;
};


/**
 * @param {ol.Pixel} pixel Pixel.
 * @return {ol.Coordinate} Coordinate.
 */
ol.Map.prototype.getCoordinateFromPixel = function(pixel) {
  var frameState = this.frameState_;
  if (goog.isNull(frameState)) {
    return null;
  } else {
    var vec2 = [pixel.x, pixel.y];
    return ol.vec.Mat4.multVec2(frameState.pixelToCoordinateMatrix, vec2, vec2);
  }
};


/**
 * @return {ol.Collection} Interactions.
 */
ol.Map.prototype.getInteractions = function() {
  return this.interactions_;
};


/**
 * @return {ol.Collection} Layers.
 */
ol.Map.prototype.getLayers = function() {
  return /** @type {ol.Collection} */ (this.get(ol.MapProperty.LAYERS));
};
goog.exportProperty(
    ol.Map.prototype,
    'getLayers',
    ol.Map.prototype.getLayers);


/**
 * @param {ol.Coordinate} coordinate Coordinate.
 * @return {ol.Pixel} Pixel.
 */
ol.Map.prototype.getPixelFromCoordinate = function(coordinate) {
  var frameState = this.frameState_;
  if (goog.isNull(frameState)) {
    return null;
  } else {
    var vec2 = coordinate.slice(0, 2);
    ol.vec.Mat4.multVec2(frameState.coordinateToPixelMatrix, vec2, vec2);
    return new ol.Pixel(vec2[0], vec2[1]);
  }
};


/**
 * @return {ol.Size|undefined} Size.
 */
ol.Map.prototype.getSize = function() {
  return /** @type {ol.Size|undefined} */ (this.get(ol.MapProperty.SIZE));
};
goog.exportProperty(
    ol.Map.prototype,
    'getSize',
    ol.Map.prototype.getSize);


/**
 * @return {ol.View} View.
 */
ol.Map.prototype.getView = function() {
  return /** @type {ol.View} */ (this.get(ol.MapProperty.VIEW));
};
goog.exportProperty(
    ol.Map.prototype,
    'getView',
    ol.Map.prototype.getView);


/**
 * @return {Element} Viewport.
 */
ol.Map.prototype.getViewport = function() {
  return this.viewport_;
};


/**
 * @return {Element} The map's overlay container. Elements added to this
 * container won't let mousedown and touchstart events through to the map, so
 * clicks and gestures on an overlay don't trigger any MapBrowserEvent.
 */
ol.Map.prototype.getOverlayContainer = function() {
  return this.overlayContainer_;
};


/**
 * @param {ol.Tile} tile Tile.
 * @param {string} tileSourceKey Tile source key.
 * @param {ol.Coordinate} tileCenter Tile center.
 * @param {number} tileResolution Tile resolution.
 * @return {number} Tile priority.
 */
ol.Map.prototype.getTilePriority =
    function(tile, tileSourceKey, tileCenter, tileResolution) {
  // Filter out tiles at higher zoom levels than the current zoom level, or that
  // are outside the visible extent.
  var frameState = this.frameState_;
  if (goog.isNull(frameState) || !(tileSourceKey in frameState.wantedTiles)) {
    return ol.structs.PriorityQueue.DROP;
  }
  var coordKey = tile.tileCoord.toString();
  if (!frameState.wantedTiles[tileSourceKey][coordKey]) {
    return ol.structs.PriorityQueue.DROP;
  }
  // Prioritize the highest zoom level tiles closest to the focus.
  // Tiles at higher zoom levels are prioritized using Math.log(tileResolution).
  // Within a zoom level, tiles are prioritized by the distance in pixels
  // between the center of the tile and the focus.  The factor of 65536 means
  // that the prioritization should behave as desired for tiles up to
  // 65536 * Math.log(2) = 45426 pixels from the focus.
  var deltaX = tileCenter[0] - frameState.focus[0];
  var deltaY = tileCenter[1] - frameState.focus[1];
  return 65536 * Math.log(tileResolution) +
      Math.sqrt(deltaX * deltaX + deltaY * deltaY) / tileResolution;
};


/**
 * @param {goog.events.BrowserEvent} browserEvent Browser event.
 * @param {string=} opt_type Type.
 */
ol.Map.prototype.handleBrowserEvent = function(browserEvent, opt_type) {
  var type = opt_type || browserEvent.type;
  var mapBrowserEvent = new ol.MapBrowserEvent(type, this, browserEvent);
  this.handleMapBrowserEvent(mapBrowserEvent);
  if (type == goog.events.EventType.MOUSEOUT) {
    this.focus_ = null;
  } else {
    this.focus_ = mapBrowserEvent.getCoordinate();
  }
};


/**
 * @param {ol.MapBrowserEvent} mapBrowserEvent The event to handle.
 */
ol.Map.prototype.handleMapBrowserEvent = function(mapBrowserEvent) {
  mapBrowserEvent.frameState = this.frameState_;
  var interactions = this.getInteractions();
  var interactionsArray = /** @type {Array.<ol.interaction.Interaction>} */
      (interactions.getArray());
  if (this.dispatchEvent(mapBrowserEvent) !== false) {
    for (var i = interactionsArray.length - 1; i >= 0; i--) {
      var interaction = interactionsArray[i];
      interaction.handleMapBrowserEvent(mapBrowserEvent);
      if (mapBrowserEvent.defaultPrevented) {
        break;
      }
    }
  }
};


/**
 * @protected
 */
ol.Map.prototype.handlePostRender = function() {

  var frameState = this.frameState_;

  // Manage the tile queue
  // Image loads are expensive and a limited resource, so try to use them
  // efficiently:
  // * When the view is static we allow a large number of parallel tile loads
  //   to complete the frame as quickly as possible.
  // * When animating or interacting, image loads can cause janks, so we reduce
  //   the maximum number of loads per frame and limit the number of parallel
  //   tile loads to remain reactive to view changes and to reduce the chance of
  //   loading tiles that will quickly disappear from view.
  var tileQueue = this.tileQueue_;
  if (!tileQueue.isEmpty()) {
    var maxTotalLoading = 16;
    var maxNewLoads = maxTotalLoading;
    if (!goog.isNull(frameState)) {
      var hints = frameState.viewHints;
      if (hints[ol.ViewHint.ANIMATING] || hints[ol.ViewHint.INTERACTING]) {
        maxTotalLoading = 8;
        maxNewLoads = 2;
      }
    }
    if (tileQueue.getTilesLoading() < maxTotalLoading) {
      tileQueue.reprioritize(); // FIXME only call if view has changed
      tileQueue.loadMoreTiles(maxTotalLoading, maxNewLoads);
    }
  }

  var postRenderFunctions = this.postRenderFunctions_;
  var i;
  for (i = 0; i < postRenderFunctions.length; ++i) {
    postRenderFunctions[i](this, frameState);
  }
  postRenderFunctions.length = 0;
};


/**
 * @private
 */
ol.Map.prototype.handleBackgroundColorChanged_ = function() {
  this.render();
};


/**
 * @private
 */
ol.Map.prototype.handleSizeChanged_ = function() {
  this.render();
};


/**
 * @private
 */
ol.Map.prototype.handleTileChange_ = function() {
  this.requestRenderFrame();
};


/**
 * @private
 */
ol.Map.prototype.handleViewPropertyChanged_ = function() {
  this.render();
};


/**
 * @private
 */
ol.Map.prototype.handleViewChanged_ = function() {
  if (!goog.isNull(this.viewPropertyListenerKey_)) {
    goog.events.unlistenByKey(this.viewPropertyListenerKey_);
    this.viewPropertyListenerKey_ = null;
  }
  var view = this.getView();
  if (goog.isDefAndNotNull(view)) {
    this.viewPropertyListenerKey_ = goog.events.listen(
        view, ol.ObjectEventType.CHANGED,
        this.handleViewPropertyChanged_, false, this);
  }
  this.render();
};


/**
 * @return {boolean} Is defined.
 */
ol.Map.prototype.isDef = function() {
  var view = this.getView();
  return goog.isDef(view) && view.isDef() &&
      goog.isDefAndNotNull(this.getSize());
};


/**
 * Render.
 */
ol.Map.prototype.render = function() {
  if (this.animationDelay_.isActive()) {
    // pass
  } else if (this.freezeRenderingCount_ === 0) {
    this.animationDelay_.fire();
  } else {
    this.dirty_ = true;
  }
};


/**
 * Request that renderFrame_ be called some time in the future.
 */
ol.Map.prototype.requestRenderFrame = function() {
  if (this.freezeRenderingCount_ === 0) {
    if (!this.animationDelay_.isActive()) {
      this.animationDelay_.start();
    }
  } else {
    this.dirty_ = true;
  }
};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @return {ol.layer.Layer|undefined} The removed layer or undefined if the
 *     layer was not found.
 */
ol.Map.prototype.removeLayer = function(layer) {
  var layers = this.getLayers();
  goog.asserts.assert(goog.isDef(layers));
  return /** @type {ol.layer.Layer|undefined} */ (layers.remove(layer));
};


/**
 * @param {number} time Time.
 * @private
 */
ol.Map.prototype.renderFrame_ = function(time) {

  var i;

  if (this.freezeRenderingCount_ != 0) {
    return;
  }

  var size = this.getSize();
  var layers = this.getLayers();
  var layersArray = goog.isDef(layers) ?
      /** @type {Array.<ol.layer.Layer>} */ (layers.getArray()) : undefined;
  var view = this.getView();
  var view2D = goog.isDef(view) ? this.getView().getView2D() : undefined;
  /** @type {?ol.FrameState} */
  var frameState = null;
  if (goog.isDef(layersArray) && goog.isDef(size) && goog.isDef(view2D) &&
      view2D.isDef()) {
    var backgroundColor = this.getBackgroundColor();
    var viewHints = view.getHints();
    var layerStates = {};
    var layer;
    for (i = 0; i < layersArray.length; ++i) {
      layer = layersArray[i];
      layerStates[goog.getUid(layer)] = layer.getLayerState();
    }
    var view2DState = view2D.getView2DState();
    frameState = {
      animate: false,
      attributions: {},
      backgroundColor: goog.isDef(backgroundColor) ?
          backgroundColor : new ol.Color(255, 255, 255, 1),
      coordinateToPixelMatrix: this.coordinateToPixelMatrix_,
      extent: null,
      focus: goog.isNull(this.focus_) ? view2DState.center : this.focus_,
      layersArray: layersArray,
      layerStates: layerStates,
      logos: {},
      pixelToCoordinateMatrix: this.pixelToCoordinateMatrix_,
      postRenderFunctions: [],
      size: size,
      tileQueue: this.tileQueue_,
      time: time,
      usedTiles: {},
      view2DState: view2DState,
      viewHints: viewHints,
      wantedTiles: {}
    };
  }

  var preRenderFunctions = this.preRenderFunctions_;
  var n = 0, preRenderFunction;
  for (i = 0; i < preRenderFunctions.length; ++i) {
    preRenderFunction = preRenderFunctions[i];
    if (preRenderFunction(this, frameState)) {
      preRenderFunctions[n++] = preRenderFunction;
    }
  }
  preRenderFunctions.length = n;

  if (!goog.isNull(frameState)) {
    // FIXME works for View2D only
    frameState.extent = ol.Extent.getForView2DAndSize(view2DState.center,
        view2DState.resolution, view2DState.rotation, frameState.size);
  }

  this.frameState_ = frameState;
  this.renderer_.renderFrame(frameState);
  this.dirty_ = false;

  if (!goog.isNull(frameState)) {
    if (frameState.animate) {
      this.requestRenderFrame();
    }
    Array.prototype.push.apply(
        this.postRenderFunctions_, frameState.postRenderFunctions);
  }

  this.dispatchEvent(
      new ol.MapEvent(ol.MapEventType.POSTRENDER, this, frameState));

  if (!this.postRenderDelay_.isActive()) {
    this.postRenderDelay_.start();
  }

};


/**
 * @param {ol.Color} backgroundColor Background color.
 */
ol.Map.prototype.setBackgroundColor = function(backgroundColor) {
  this.set(ol.MapProperty.BACKGROUND_COLOR, backgroundColor);
};
goog.exportProperty(
    ol.Map.prototype,
    'setBackgroundColor',
    ol.Map.prototype.setBackgroundColor);


/**
 * @param {ol.Collection} layers Layers.
 */
ol.Map.prototype.setLayers = function(layers) {
  this.set(ol.MapProperty.LAYERS, layers);
};
goog.exportProperty(
    ol.Map.prototype,
    'setLayers',
    ol.Map.prototype.setLayers);


/**
 * @param {ol.Size} size Size.
 */
ol.Map.prototype.setSize = function(size) {
  this.set(ol.MapProperty.SIZE, size);
};
goog.exportProperty(
    ol.Map.prototype,
    'setSize',
    ol.Map.prototype.setSize);


/**
 * @param {ol.IView} view View.
 */
ol.Map.prototype.setView = function(view) {
  this.set(ol.MapProperty.VIEW, view);
};
goog.exportProperty(
    ol.Map.prototype,
    'setView',
    ol.Map.prototype.setView);


/**
 * Unfreeze rendering.
 */
ol.Map.prototype.unfreezeRendering = function() {
  goog.asserts.assert(this.freezeRenderingCount_ > 0);
  if (--this.freezeRenderingCount_ === 0 && this.dirty_) {
    this.animationDelay_.fire();
  }
};


/**
 * Force a recalculation of the map viewport size.  This should be called when
 * third-party code changes the size of the map viewport.
 */
ol.Map.prototype.updateSize = function() {
  var size = goog.style.getSize(this.target_);
  this.setSize(new ol.Size(size.width, size.height));
};


/**
 * @param {function(this: T)} f Function.
 * @param {T=} opt_obj Object.
 * @template T
 */
ol.Map.prototype.withFrozenRendering = function(f, opt_obj) {
  this.freezeRendering();
  try {
    f.call(opt_obj);
  } finally {
    this.unfreezeRendering();
  }
};


/**
 * @typedef {{controls: Array.<ol.control.Control>,
 *            interactions: ol.Collection,
 *            rendererConstructor:
 *                function(new: ol.renderer.Map, Element, ol.Map),
 *            target: Element,
 *            values: Object.<string, *>}}
 */
ol.MapOptionsInternal;


/**
 * @param {ol.MapOptions} options Map options.
 * @return {ol.MapOptionsInternal} Internal map options.
 */
ol.Map.createOptionsInternal = function(options) {

  /**
   * @type {Object.<string, *>}
   */
  var values = {};

  var layers;
  if (goog.isDef(options.layers)) {
    if (goog.isArray(options.layers)) {
      layers = new ol.Collection(goog.array.clone(options.layers));
    } else {
      goog.asserts.assertInstanceof(options.layers, ol.Collection);
      layers = options.layers;
    }
  } else {
    layers = new ol.Collection();
  }
  values[ol.MapProperty.LAYERS] = layers;

  values[ol.MapProperty.VIEW] = goog.isDef(options.view) ?
      options.view : new ol.View2D();

  /**
   * @type {function(new: ol.renderer.Map, Element, ol.Map)}
   */
  var rendererConstructor = ol.renderer.Map;

  /**
   * @type {Array.<ol.RendererHint>}
   */
  var rendererHints;
  if (goog.isDef(options.renderers)) {
    rendererHints = options.renderers;
  } else if (goog.isDef(options.renderer)) {
    rendererHints = [options.renderer];
  } else {
    rendererHints = ol.DEFAULT_RENDERER_HINTS;
  }

  var i, rendererHint;
  for (i = 0; i < rendererHints.length; ++i) {
    rendererHint = rendererHints[i];
    if (rendererHint == ol.RendererHint.CANVAS) {
      if (ol.ENABLE_CANVAS && ol.renderer.canvas.SUPPORTED) {
        rendererConstructor = ol.renderer.canvas.Map;
        break;
      }
    } else if (rendererHint == ol.RendererHint.DOM) {
      if (ol.ENABLE_DOM && ol.renderer.dom.SUPPORTED) {
        rendererConstructor = ol.renderer.dom.Map;
        break;
      }
    } else if (rendererHint == ol.RendererHint.WEBGL) {
      if (ol.ENABLE_WEBGL && ol.renderer.webgl.SUPPORTED) {
        rendererConstructor = ol.renderer.webgl.Map;
        break;
      }
    }
  }

  var controls = goog.isDef(options.controls) ?
      options.controls : ol.control.defaults();

  var interactions = goog.isDef(options.interactions) ?
      options.interactions : ol.interaction.defaults();

  /**
   * @type {Element}
   */
  var target = goog.dom.getElement(options.target);

  return {
    controls: controls,
    interactions: interactions,
    rendererConstructor: rendererConstructor,
    target: target,
    values: values
  };

};


/**
 * @param {goog.Uri.QueryData=} opt_queryData Query data.
 * @return {Array.<ol.RendererHint>} Renderer hints.
 */
ol.RendererHints.createFromQueryData = function(opt_queryData) {
  var query = goog.global.location.search.substring(1),
      queryData = goog.isDef(opt_queryData) ?
          opt_queryData : new goog.Uri.QueryData(query);
  if (queryData.containsKey('renderers')) {
    return queryData.get('renderers').split(',');
  } else if (queryData.containsKey('renderer')) {
    return [queryData.get('renderer')];
  } else {
    return ol.DEFAULT_RENDERER_HINTS;
  }
};


ol.projection.addCommonProjections();
