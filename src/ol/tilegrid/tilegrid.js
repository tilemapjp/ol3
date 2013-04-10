// FIXME cope with tile grids whose minium zoom is not zero

goog.provide('ol.tilegrid.TileGrid');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('ol.Coordinate');
goog.require('ol.Extent');
goog.require('ol.PixelBounds');
goog.require('ol.Projection');
goog.require('ol.Size');
goog.require('ol.TileCoord');
goog.require('ol.TileRange');
goog.require('ol.array');


/**
 * @define {number} Default tile size.
 */
ol.DEFAULT_TILE_SIZE = 256;


/**
 * @define {number} Default maximum zoom for default tile grids.
 */
ol.DEFAULT_MAX_ZOOM = 42;



/**
 * @constructor
 * @param {ol.tilegrid.TileGridOptions} options Tile grid options.
 */
ol.tilegrid.TileGrid = function(options) {

  /**
   * @private
   * @type {!Array.<number>}
   */
  this.resolutions_ = options.resolutions;
  goog.asserts.assert(goog.array.isSorted(this.resolutions_, function(a, b) {
    return b - a;
  }, true));

  /**
   * @private
   * @type {number}
   */
  this.numResolutions_ = this.resolutions_.length;

  /**
   * @private
   * @type {ol.Coordinate}
   */
  this.origin_ = goog.isDef(options.origin) ? options.origin : null;

  /**
   * @private
   * @type {Array.<ol.Coordinate>}
   */
  this.origins_ = null;
  if (goog.isDef(options.origins)) {
    this.origins_ = options.origins;
    goog.asserts.assert(this.origins_.length == this.resolutions_.length);
  }
  goog.asserts.assert(
      (goog.isNull(this.origin_) && !goog.isNull(this.origins_)) ||
      (!goog.isNull(this.origin_) && goog.isNull(this.origins_)));

  /**
   * @private
   * @type {Array.<ol.Size>}
   */
  this.tileSizes_ = null;
  if (goog.isDef(options.tileSizes)) {
    this.tileSizes_ = options.tileSizes;
    goog.asserts.assert(this.tileSizes_.length == this.resolutions_.length);
  }

  /**
   * @private
   * @type {ol.Size}
   */
  this.tileSize_ = goog.isDef(options.tileSize) ?
      options.tileSize :
      goog.isNull(this.tileSizes_) ?
          new ol.Size(ol.DEFAULT_TILE_SIZE, ol.DEFAULT_TILE_SIZE) : null;
  goog.asserts.assert(
      (goog.isNull(this.tileSize_) && !goog.isNull(this.tileSizes_)) ||
      (!goog.isNull(this.tileSize_) && goog.isNull(this.tileSizes_)));

};


/**
 * @private
 * @type {ol.TileCoord}
 */
ol.tilegrid.TileGrid.tmpTileCoord_ = new ol.TileCoord(0, 0, 0);


/**
 * @param {ol.TileCoord} tileCoord Tile coordinate.
 * @param {function(this: T, number, ol.TileRange): boolean} callback Callback.
 * @param {T=} opt_obj Object.
 * @param {ol.TileRange=} opt_tileRange Temporary ol.TileRange object.
 * @param {ol.Extent=} opt_extent Temporary ol.Extent object.
 * @return {boolean} Callback succeeded.
 * @template T
 */
ol.tilegrid.TileGrid.prototype.forEachTileCoordParentTileRange =
    function(tileCoord, callback, opt_obj, opt_tileRange, opt_extent) {
  var tileCoordExtent = this.getTileCoordExtent(tileCoord, opt_extent);
  var z = tileCoord.z - 1;
  while (z >= 0) {
    if (callback.call(opt_obj, z,
        this.getTileRangeForExtentAndZ(tileCoordExtent, z, opt_tileRange))) {
      return true;
    }
    --z;
  }
  return false;
};


/**
 * @param {number} z Z.
 * @return {ol.Coordinate} Origin.
 */
ol.tilegrid.TileGrid.prototype.getOrigin = function(z) {
  if (!goog.isNull(this.origin_)) {
    return this.origin_;
  } else {
    goog.asserts.assert(!goog.isNull(this.origins_));
    goog.asserts.assert(0 <= z && z < this.origins_.length);
    return this.origins_[z];
  }
};


/**
 * @param {ol.TileCoord} tileCoord Tile coordinate.
 * @param {number} resolution Resolution.
 * @return {ol.PixelBounds} Pixel bounds.
 */
ol.tilegrid.TileGrid.prototype.getPixelBoundsForTileCoordAndResolution =
    function(tileCoord, resolution) {
  var scale = resolution / this.getResolution(tileCoord.z);
  var tileSize = this.getTileSize(tileCoord.z);
  var tileWidth = tileSize.width / scale;
  var tileHeight = tileSize.height / scale;
  var minX = Math.round(tileCoord.x * tileWidth);
  var minY = Math.round(tileCoord.y * tileHeight);
  var maxX = Math.round((tileCoord.x + 1) * tileWidth);
  var maxY = Math.round((tileCoord.y + 1) * tileHeight);
  return new ol.PixelBounds(minX, minY, maxX, maxY);
};


/**
 * @param {number} z Z.
 * @return {number} Resolution.
 */
ol.tilegrid.TileGrid.prototype.getResolution = function(z) {
  goog.asserts.assert(0 <= z && z < this.numResolutions_);
  return this.resolutions_[z];
};


/**
 * @return {Array.<number>} Resolutions.
 */
ol.tilegrid.TileGrid.prototype.getResolutions = function() {
  return this.resolutions_;
};


/**
 * @param {ol.TileCoord} tileCoord Tile coordinate.
 * @param {ol.TileRange=} opt_tileRange Temporary ol.TileRange object.
 * @param {ol.Extent=} opt_extent Temporary ol.Extent object.
 * @return {ol.TileRange} Tile range.
 */
ol.tilegrid.TileGrid.prototype.getTileCoordChildTileRange =
    function(tileCoord, opt_tileRange, opt_extent) {
  if (tileCoord.z < this.resolutions_.length) {
    var tileCoordExtent = this.getTileCoordExtent(tileCoord, opt_extent);
    return this.getTileRangeForExtentAndZ(
        tileCoordExtent, tileCoord.z + 1, opt_tileRange);
  } else {
    return null;
  }
};


/**
 * @param {number} z Z.
 * @param {ol.TileRange} tileRange Tile range.
 * @param {ol.Extent=} opt_extent Temporary ol.Extent object.
 * @return {ol.Extent} Extent.
 */
ol.tilegrid.TileGrid.prototype.getTileRangeExtent =
    function(z, tileRange, opt_extent) {
  var origin = this.getOrigin(z);
  var resolution = this.getResolution(z);
  var tileSize = this.getTileSize(z);
  var minX = origin[0] + tileRange.minX * tileSize.width * resolution;
  var minY = origin[1] + tileRange.minY * tileSize.height * resolution;
  var maxX = origin[0] + (tileRange.maxX + 1) * tileSize.width * resolution;
  var maxY = origin[1] + (tileRange.maxY + 1) * tileSize.height * resolution;
  return new ol.Extent(minX, minY, maxX, maxY);
};


/**
 * @param {ol.Extent} extent Extent.
 * @param {number} resolution Resolution.
 * @param {ol.TileRange=} opt_tileRange Temporary tile range object.
 * @return {ol.TileRange} Tile range.
 */
ol.tilegrid.TileGrid.prototype.getTileRangeForExtentAndResolution =
    function(extent, resolution, opt_tileRange) {
  var tileCoord = ol.tilegrid.TileGrid.tmpTileCoord_;
  this.getTileCoordForXYAndResolution_(
      extent.minX, extent.minY, resolution, false, tileCoord);
  var minX = tileCoord.x;
  var minY = tileCoord.y;
  this.getTileCoordForXYAndResolution_(
      extent.maxX, extent.maxY, resolution, true, tileCoord);
  return ol.TileRange.createOrUpdate(
      minX, minY, tileCoord.x, tileCoord.y, opt_tileRange);
};


/**
 * @param {ol.Extent} extent Extent.
 * @param {number} z Z.
 * @param {ol.TileRange=} opt_tileRange Temporary tile range object.
 * @return {ol.TileRange} Tile range.
 */
ol.tilegrid.TileGrid.prototype.getTileRangeForExtentAndZ =
    function(extent, z, opt_tileRange) {
  var resolution = this.getResolution(z);
  return this.getTileRangeForExtentAndResolution(
      extent, resolution, opt_tileRange);
};


/**
 * @param {ol.TileCoord} tileCoord Tile coordinate.
 * @return {ol.Coordinate} Tile center.
 */
ol.tilegrid.TileGrid.prototype.getTileCoordCenter = function(tileCoord) {
  var origin = this.getOrigin(tileCoord.z);
  var resolution = this.getResolution(tileCoord.z);
  var tileSize = this.getTileSize(tileCoord.z);
  return [
    origin[0] + (tileCoord.x + 0.5) * tileSize.width * resolution,
    origin[1] + (tileCoord.y + 0.5) * tileSize.height * resolution
  ];
};


/**
 * @param {ol.TileCoord} tileCoord Tile coordinate.
 * @param {ol.Extent=} opt_extent Temporary extent object.
 * @return {ol.Extent} Extent.
 */
ol.tilegrid.TileGrid.prototype.getTileCoordExtent =
    function(tileCoord, opt_extent) {
  var origin = this.getOrigin(tileCoord.z);
  var resolution = this.getResolution(tileCoord.z);
  var tileSize = this.getTileSize(tileCoord.z);
  var minX = origin[0] + tileCoord.x * tileSize.width * resolution;
  var minY = origin[1] + tileCoord.y * tileSize.height * resolution;
  var maxX = minX + tileSize.width * resolution;
  var maxY = minY + tileSize.height * resolution;
  return ol.Extent.createOrUpdate(minX, minY, maxX, maxY, opt_extent);
};


/**
 * Get the tile coordinate for the given map coordinate and resolution.  This
 * method considers that coordinates that intersect tile boundaries should be
 * assigned the higher tile coordinate.
 *
 * @param {ol.Coordinate} coordinate Coordinate.
 * @param {number} resolution Resolution.
 * @param {ol.TileCoord=} opt_tileCoord Destination ol.TileCoord object.
 * @return {ol.TileCoord} Tile coordinate.
 */
ol.tilegrid.TileGrid.prototype.getTileCoordForCoordAndResolution = function(
    coordinate, resolution, opt_tileCoord) {
  return this.getTileCoordForXYAndResolution_(
      coordinate[0], coordinate[1], resolution, false, opt_tileCoord);
};


/**
 * @param {number} x X.
 * @param {number} y Y.
 * @param {number} resolution Resolution.
 * @param {boolean} reverseIntersectionPolicy Instead of letting edge
 *     intersections go to the higher tile coordinate, let edge intersections
 *     go to the lower tile coordinate.
 * @param {ol.TileCoord=} opt_tileCoord Temporary ol.TileCoord object.
 * @return {ol.TileCoord} Tile coordinate.
 * @private
 */
ol.tilegrid.TileGrid.prototype.getTileCoordForXYAndResolution_ = function(
    x, y, resolution, reverseIntersectionPolicy, opt_tileCoord) {
  var z = this.getZForResolution(resolution);
  var scale = resolution / this.getResolution(z);
  var origin = this.getOrigin(z);
  var tileSize = this.getTileSize(z);

  var tileCoordX = scale * (x - origin[0]) / (resolution * tileSize.width);
  var tileCoordY = scale * (y - origin[1]) / (resolution * tileSize.height);

  if (reverseIntersectionPolicy) {
    tileCoordX = Math.ceil(tileCoordX) - 1;
    tileCoordY = Math.ceil(tileCoordY) - 1;
  } else {
    tileCoordX = Math.floor(tileCoordX);
    tileCoordY = Math.floor(tileCoordY);
  }

  return ol.TileCoord.createOrUpdate(z, tileCoordX, tileCoordY, opt_tileCoord);
};


/**
 * @param {ol.Coordinate} coordinate Coordinate.
 * @param {number} z Z.
 * @param {ol.TileCoord=} opt_tileCoord Destination ol.TileCoord object.
 * @return {ol.TileCoord} Tile coordinate.
 */
ol.tilegrid.TileGrid.prototype.getTileCoordForCoordAndZ =
    function(coordinate, z, opt_tileCoord) {
  var resolution = this.getResolution(z);
  return this.getTileCoordForXYAndResolution_(
      coordinate[0], coordinate[1], resolution, false, opt_tileCoord);
};


/**
 * @param {ol.TileCoord} tileCoord Tile coordinate.
 * @return {number} Tile resolution.
 */
ol.tilegrid.TileGrid.prototype.getTileCoordResolution = function(tileCoord) {
  goog.asserts.assert(0 <= tileCoord.z && tileCoord.z < this.numResolutions_);
  return this.resolutions_[tileCoord.z];
};


/**
 * @param {number} z Z.
 * @return {ol.Size} Tile size.
 */
ol.tilegrid.TileGrid.prototype.getTileSize = function(z) {
  if (!goog.isNull(this.tileSize_)) {
    return this.tileSize_;
  } else {
    goog.asserts.assert(!goog.isNull(this.tileSizes_));
    goog.asserts.assert(0 <= z && z < this.tileSizes_.length);
    return this.tileSizes_[z];
  }
};


/**
 * @param {number} resolution Resolution.
 * @return {number} Z.
 */
ol.tilegrid.TileGrid.prototype.getZForResolution = function(resolution) {
  return ol.array.linearFindNearest(this.resolutions_, resolution, 0);
};


/**
 * @param {ol.Projection} projection Projection.
 * @return {ol.tilegrid.TileGrid} Default tile grid for the passed projection.
 */
ol.tilegrid.getForProjection = function(projection) {
  var tileGrid = projection.getDefaultTileGrid();
  if (goog.isNull(tileGrid)) {
    tileGrid = ol.tilegrid.createForProjection(projection);
    projection.setDefaultTileGrid(tileGrid);
  }
  return tileGrid;
};


/**
 * @param {ol.Projection} projection Projection.
 * @param {number=} opt_maxZoom Maximum zoom level.
 * @param {ol.Size=} opt_tileSize Tile size.
 * @return {ol.tilegrid.TileGrid} TileGrid instance.
 */
ol.tilegrid.createForProjection =
    function(projection, opt_maxZoom, opt_tileSize) {
  var projectionExtent = projection.getExtent();
  var size = Math.max(
      projectionExtent.maxX - projectionExtent.minX,
      projectionExtent.maxY - projectionExtent.minY);
  var maxZoom = goog.isDef(opt_maxZoom) ?
      opt_maxZoom : ol.DEFAULT_MAX_ZOOM;
  var tileSize = goog.isDef(opt_tileSize) ?
      opt_tileSize : new ol.Size(ol.DEFAULT_TILE_SIZE, ol.DEFAULT_TILE_SIZE);
  var resolutions = new Array(maxZoom + 1);
  goog.asserts.assert(tileSize.width == tileSize.height);
  size = size / tileSize.width;
  for (var z = 0, zz = resolutions.length; z < zz; ++z) {
    resolutions[z] = size / Math.pow(2, z);
  }
  return new ol.tilegrid.TileGrid({
    origin: projectionExtent.getBottomLeft(),
    resolutions: resolutions,
    tileSize: tileSize
  });
};
