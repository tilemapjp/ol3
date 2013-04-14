goog.provide('ol.projection.Illustmap');
goog.provide('ol.projection.IllustmapOptions');

goog.require('ol.Extent');
goog.require('ol.Projection');
goog.require('ol.ProjectionUnits');
goog.require('ol.projection');

/**
 * @typedef {{extent: (ol.Extent)}}
 */
ol.projection.IllustmapOptions;

/**
 * @constructor
 * @extends {ol.Projection}
 * @param {string} code Code.
 * @param {ol.projection.IllustmapOptions} options Options.
 */
ol.projection.Illustmap = function(code, options) {
  goog.base(this, {
    code: code,
    units: ol.ProjectionUnits.METERS,
    extent: options.extent,
    axisOrientation: 'esu',
    global: true
  });
};
goog.inherits(ol.projection.Illustmap, ol.Projection);

/**
 * @inheritDoc
 */
ol.projection.Illustmap.prototype.getPointResolution =
    function(resolution, point) {
  return resolution;
};
