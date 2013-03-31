goog.provide('ol.renderer.webgl.VectorLayer2');

goog.require('goog.webgl');
goog.require('ol.Extent');
goog.require('ol.Size');
goog.require('ol.math');
goog.require('ol.renderer.webgl.Layer');
goog.require('ol.renderer.webgl.vectorlayer2.shader.PointCollection');



/**
 * @constructor
 * @extends {ol.renderer.webgl.Layer}
 * @param {ol.renderer.Map} mapRenderer Map renderer.
 * @param {ol.layer.VectorLayer2} vectorLayer2 Vector layer.
 */
ol.renderer.webgl.VectorLayer2 = function(mapRenderer, vectorLayer2) {

  goog.base(this, mapRenderer, vectorLayer2);

  /**
   * @private
   * @type {!goog.vec.Mat4.Number}
   */
  this.projectionMatrix_ = goog.vec.Mat4.createNumberIdentity();

  /**
   * @private
   * @type {ol.Extent}
   */
  this.renderedExtent_ = null;

  /**
   * @private
   * @type {number}
   */
  this.renderedResolution_ = NaN;

  /**
   * @private
   * @type {number}
   */
  this.renderedRotation_ = NaN;

  /**
   * @private
   * @type {{a_position: number,
   *         u_color: WebGLUniformLocation,
   *         u_pointSize: WebGLUniformLocation,
   *         u_projectionMatrix: WebGLUniformLocation}|null}
   */
  this.pointCollectionLocations_ = null;

};
goog.inherits(ol.renderer.webgl.VectorLayer2, ol.renderer.webgl.Layer);


/**
 * @return {ol.layer.VectorLayer2} Vector layer.
 */
ol.renderer.webgl.VectorLayer2.prototype.getVectorLayer = function() {
  return /** @type {ol.layer.VectorLayer2} */ (this.getLayer());
};


/**
 * @inheritDoc
 */
ol.renderer.webgl.VectorLayer2.prototype.handleWebGLContextLost = function() {
  goog.base(this, 'handleWebGLContextLost');
  this.pointCollectionLocations_ = null;
};


/**
 * @inheritDoc
 */
ol.renderer.webgl.VectorLayer2.prototype.renderFrame =
    function(frameState, layerState) {

  var mapRenderer = this.getWebGLMapRenderer();
  var gl = mapRenderer.getGL();

  var view2DState = frameState.view2DState;
  var projection = view2DState.projection;

  var vectorLayer = this.getVectorLayer();
  var vectorSource = vectorLayer.getVectorSource();
  var vectorSourceKey = goog.getUid(vectorSource).toString();

  var extent = frameState.extent;

  /*
  if (goog.isNull(this.renderedExtent_) ||
      !this.renderedExtent_.containsExtent(extent) ||
      this.renderedResolution_ != resolution ||
      this.renderedRotation_ != rotation) {
  */

  var size = frameState.size;
  var framebufferDimension = ol.math.roundUpToPowerOfTwo(
      Math.sqrt(size.width * size.width + size.height * size.height));

  this.bindFramebuffer(frameState, framebufferDimension);
  gl.viewport(0, 0, framebufferDimension, framebufferDimension);

  var framebufferExtent = ol.Extent.getForView2DAndSize(
      view2DState.center,
      view2DState.resolution,
      view2DState.rotation,
      new ol.Size(framebufferDimension, framebufferDimension));

  gl.clearColor(0, 0, 0, 0);
  gl.clear(goog.webgl.COLOR_BUFFER_BIT);
  gl.enable(goog.webgl.BLEND);

  // FIXME configure projection matrix
  goog.vec.Mat4.makeIdentity(this.projectionMatrix_);
  goog.vec.Mat4.scale(this.projectionMatrix_,
      1 / (view2DState.resolution * framebufferDimension),
      1 / (view2DState.resolution * framebufferDimension),
      1);
  goog.vec.Mat4.translate(this.projectionMatrix_,
      -view2DState.center.x,
      -view2DState.center.y,
      0);

  var pointCollections = vectorSource.getPointCollections();
  if (pointCollections.length > 0) {
    this.renderPointCollections(pointCollections);
  }

  // FIXME configure projection matrix
  var projectionMatrix = this.projectionMatrix;
  goog.vec.Mat4.makeIdentity(projectionMatrix);

  // FIXME configure texCoord matrix
  var texCoordMatrix = this.texCoordMatrix;
  goog.vec.Mat4.makeIdentity(texCoordMatrix);
  goog.vec.Mat4.translate(texCoordMatrix,
      (view2DState.center.x - framebufferExtent.minX) /
          (framebufferExtent.maxX - framebufferExtent.minX),
      (view2DState.center.y - framebufferExtent.minY) /
          (framebufferExtent.maxY - framebufferExtent.minY),
      0);
  goog.vec.Mat4.rotateZ(texCoordMatrix, view2DState.rotation);
  goog.vec.Mat4.scale(texCoordMatrix,
      view2DState.resolution /
          (framebufferExtent.maxX - framebufferExtent.minX),
      view2DState.resolution /
          (framebufferExtent.maxY - framebufferExtent.minY),
      1);
  goog.vec.Mat4.translate(texCoordMatrix,
      -0.5,
      -0.5,
      0);

};


/**
 * @param {Array.<ol.geom2.PointCollection>} pointCollections Point collections.
 */
ol.renderer.webgl.VectorLayer2.prototype.renderPointCollections =
    function(pointCollections) {

  var mapRenderer = this.getWebGLMapRenderer();
  var gl = mapRenderer.getGL();

  var fragmentShader = ol.renderer.webgl.vectorlayer2.shader.
      PointCollectionFragment.getInstance();
  var vertexShader = ol.renderer.webgl.vectorlayer2.shader.
      PointCollectionVertex.getInstance();
  var program = mapRenderer.getProgram(fragmentShader, vertexShader);
  gl.useProgram(program);
  if (goog.isNull(this.pointCollectionLocations_)) {
    this.pointCollectionLocations_ = {
      a_position: gl.getAttribLocation(program, ol.renderer.webgl.
          vectorlayer2.shader.PointCollection.attribute.a_position),
      u_color: gl.getUniformLocation(program, ol.renderer.webgl.
          vectorlayer2.shader.PointCollection.uniform.u_color),
      u_pointSize: gl.getUniformLocation(program, ol.renderer.webgl.
          vectorlayer2.shader.PointCollection.uniform.u_pointSize),
      u_projectionMatrix: gl.getUniformLocation(program, ol.renderer.webgl.
          vectorlayer2.shader.PointCollection.uniform.u_projectionMatrix)
    };
  }

  gl.uniformMatrix4fv(this.pointCollectionLocations_.u_projectionMatrix, false,
      this.projectionMatrix_);

  var buf, dim, i, pointCollection;
  for (i = 0; i < pointCollections.length; ++i) {
    pointCollection = pointCollections[i];
    buf = pointCollection.buf;
    dim = pointCollection.dim;
    mapRenderer.bindBuffer(goog.webgl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(this.pointCollectionLocations_.a_position);
    gl.vertexAttribPointer(this.pointCollectionLocations_.a_position, 2,
        goog.webgl.FLOAT, false, 4 * dim, 0);
    gl.uniform4fv(this.pointCollectionLocations_.u_color, [1, 0, 0, 0.75]);
    gl.uniform1f(this.pointCollectionLocations_.u_pointSize, 1.5);
    buf.forEachRange(function(start, stop) {
      gl.drawArrays(goog.webgl.POINTS, start / dim, (stop - start) / dim);
    });
  }

};
