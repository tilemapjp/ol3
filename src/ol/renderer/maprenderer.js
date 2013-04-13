goog.provide('ol.renderer.Map');

goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dispose');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.functions');
goog.require('goog.object');
goog.require('goog.vec.Mat4');
goog.require('ol.CollectionEvent');
goog.require('ol.CollectionEventType');
goog.require('ol.FrameState');
goog.require('ol.Object');
goog.require('ol.layer.Layer');
goog.require('ol.renderer.Layer');



/**
 * @constructor
 * @extends {goog.Disposable}
 * @param {Element} container Container.
 * @param {ol.Map} map Map.
 */
ol.renderer.Map = function(container, map) {

  goog.base(this);

  /**
   * @private
   * @type {Element}
   */
  this.container_ = container;

  /**
   * @private
   * @type {ol.Map}
   */
  this.map_ = map;

  /**
   * @private
   * @type {Object.<number, ol.renderer.Layer>}
   */
  this.layerRenderers_ = {};

  //
  // We listen to layer add/remove to add/remove layer renderers.
  //

  /**
   * @private
   * @type {?number}
   */
  this.mapLayersChangedListenerKey_ =
      goog.events.listen(
          map, ol.Object.getChangedEventType(ol.MapProperty.LAYERS),
          this.handleLayersChanged_, false, this);

  /**
   * @private
   * @type {Array.<number>}
   */
  this.layersListenerKeys_ = null;

  /**
   * @private
   * @type {Object.<number, ?number>}
   */
  this.layerRendererChangeListenKeys_ = {};

};
goog.inherits(ol.renderer.Map, goog.Disposable);


/**
 * @param {ol.layer.Layer} layer Layer.
 * @private
 */
ol.renderer.Map.prototype.addLayer_ = function(layer) {
  var layerRenderer = this.createLayerRenderer(layer);
  this.setLayerRenderer_(layer, layerRenderer);
  this.getMap().render();
};


/**
 * @param {ol.FrameState} frameState FrameState.
 * @protected
 */
ol.renderer.Map.prototype.calculateMatrices2D = function(frameState) {

  var view2DState = frameState.view2DState;
  var coordinateToPixelMatrix = frameState.coordinateToPixelMatrix;

  goog.vec.Mat4.makeIdentity(coordinateToPixelMatrix);
  goog.vec.Mat4.translate(coordinateToPixelMatrix,
      frameState.size.width / 2,
      frameState.size.height / 2,
      0);
  goog.vec.Mat4.scale(coordinateToPixelMatrix,
      1 / view2DState.resolution,
      -1 / view2DState.resolution,
      1);
  goog.vec.Mat4.rotateZ(coordinateToPixelMatrix,
      -view2DState.rotation);
  goog.vec.Mat4.translate(coordinateToPixelMatrix,
      -view2DState.center[0],
      -view2DState.center[1],
      0);

  var inverted = goog.vec.Mat4.invert(
      coordinateToPixelMatrix, frameState.pixelToCoordinateMatrix);
  goog.asserts.assert(inverted);

};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @protected
 * @return {ol.renderer.Layer} layerRenderer Layer renderer.
 */
ol.renderer.Map.prototype.createLayerRenderer = function(layer) {
  return new ol.renderer.Layer(this, layer);
};


/**
 * @inheritDoc
 */
ol.renderer.Map.prototype.disposeInternal = function() {
  goog.object.forEach(this.layerRenderers_, function(layerRenderer) {
    goog.dispose(layerRenderer);
  });
  goog.events.unlistenByKey(this.mapLayersChangedListenerKey_);
  if (!goog.isNull(this.layersListenerKeys_)) {
    goog.array.forEach(this.layersListenerKeys_, goog.events.unlistenByKey);
  }
  goog.base(this, 'disposeInternal');
};


/**
 * @return {Element} Canvas.
 */
ol.renderer.Map.prototype.getCanvas = goog.functions.NULL;


/**
 * @param {ol.layer.Layer} layer Layer.
 * @protected
 * @return {ol.renderer.Layer} Layer renderer.
 */
ol.renderer.Map.prototype.getLayerRenderer = function(layer) {
  var layerKey = goog.getUid(layer);
  var layerRenderer = this.layerRenderers_[layerKey];
  goog.asserts.assert(goog.isDef(layerRenderer));
  return layerRenderer;
};


/**
 * @protected
 * @return {Object.<number, ol.renderer.Layer>} Layer renderers.
 */
ol.renderer.Map.prototype.getLayerRenderers = function() {
  return this.layerRenderers_;
};


/**
 * @return {ol.Map} Map.
 */
ol.renderer.Map.prototype.getMap = function() {
  return this.map_;
};


/**
 * @param {goog.events.Event} event Event.
 * @private
 */
ol.renderer.Map.prototype.handleLayerRendererChange_ = function(event) {
  this.getMap().render();
};


/**
 * @param {ol.CollectionEvent} collectionEvent Collection event.
 * @private
 */
ol.renderer.Map.prototype.handleLayersAdd_ = function(collectionEvent) {
  var layer = /** @type {ol.layer.Layer} */ (collectionEvent.elem);
  this.addLayer_(layer);
};


/**
 * @private
 */
ol.renderer.Map.prototype.handleLayersChanged_ = function() {
  goog.disposeAll(goog.object.getValues(this.layerRenderers_));
  this.layerRenderers_ = {};
  if (!goog.isNull(this.layersListenerKeys_)) {
    goog.array.forEach(this.layersListenerKeys_, goog.events.unlistenByKey);
    this.layersListenerKeys_ = null;
  }
  var layers = this.getMap().getLayers();
  if (goog.isDefAndNotNull(layers)) {
    layers.forEach(this.addLayer_, this);
    this.layersListenerKeys_ = [
      goog.events.listen(layers, ol.CollectionEventType.ADD,
          this.handleLayersAdd_, false, this),
      goog.events.listen(layers, ol.CollectionEventType.REMOVE,
          this.handleLayersRemove_, false, this)
    ];
  }
};


/**
 * @param {ol.CollectionEvent} collectionEvent Collection event.
 * @private
 */
ol.renderer.Map.prototype.handleLayersRemove_ = function(collectionEvent) {
  var layer = /** @type {ol.layer.Layer} */ (collectionEvent.elem);
  this.removeLayer_(layer);
};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @private
 */
ol.renderer.Map.prototype.removeLayer_ = function(layer) {
  goog.dispose(this.removeLayerRenderer_(layer));
  this.getMap().render();
};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @return {ol.renderer.Layer} Layer renderer.
 * @private
 */
ol.renderer.Map.prototype.removeLayerRenderer_ = function(layer) {
  var layerKey = goog.getUid(layer);
  if (layerKey in this.layerRenderers_) {
    var layerRenderer = this.layerRenderers_[layerKey];
    delete this.layerRenderers_[layerKey];
    goog.events.unlistenByKey(this.layerRendererChangeListenKeys_[layerKey]);
    delete this.layerRendererChangeListenKeys_[layerKey];
    return layerRenderer;
  } else {
    return null;
  }
};


/**
 * Render.
 * @param {?ol.FrameState} frameState Frame state.
 */
ol.renderer.Map.prototype.renderFrame = goog.nullFunction;


/**
 * @param {ol.layer.Layer} layer Layer.
 * @param {ol.renderer.Layer} layerRenderer Layer renderer.
 * @private
 */
ol.renderer.Map.prototype.setLayerRenderer_ = function(layer, layerRenderer) {
  var layerKey = goog.getUid(layer);
  goog.asserts.assert(!(layerKey in this.layerRenderers_));
  this.layerRenderers_[layerKey] = layerRenderer;
  goog.asserts.assert(!(layerKey in this.layerRendererChangeListenKeys_));
  this.layerRendererChangeListenKeys_[layerKey] = goog.events.listen(
      layerRenderer, goog.events.EventType.CHANGE,
      this.handleLayerRendererChange_, false, this);
};
