goog.require('ol.Map');
goog.require('ol.RendererHints');
goog.require('ol.View2D');
goog.require('ol.layer.TileLayer');
goog.require('ol.projection');
goog.require('ol.dom.Input');
goog.require('ol.source.BingMaps');
goog.require('ol.source.XYZ');

goog.require('ol.projection.Illustmap');

var styles = ['Road', 'Aerial', 'AerialWithLabels'];
//var layers = [];
//for (var i = 0; i < styles.length; ++i) {
//  layers.push(new ol.layer.TileLayer({
//    visible: false,
//    preload: Infinity,
//    source: new ol.source.BingMaps({
//      key: 'AgodEAYOPBDvCgvgOTnoo47nj-TQ1_vkjH6761FXyBGBYTiNf8gfluRvNEHoysig',
//      style: styles[i]
//    })
//  }));
//}
var layer_bing = new ol.layer.TileLayer({
  visible: true,
  preload: Infinity,
  source: new ol.source.BingMaps({
    key: 'AgodEAYOPBDvCgvgOTnoo47nj-TQ1_vkjH6761FXyBGBYTiNf8gfluRvNEHoysig',
    style: 'Road'
  })
});
var layer_tps = new ol.layer.TileLayer({
  visible: true,
  preload: Infinity,
  source: new ol.source.XYZ({
    crossOrigin: 'anonymous',
    url: 'http://t.tilemap.jp/kishiwada/tps/{z}/{x}/{y}.png',
    scheme: 'tms',
    maxZoom: 18
  })
});
var layer_hlm = new ol.layer.TileLayer({
  visible: true,
  preload: Infinity,
  source: new ol.source.XYZ({
    crossOrigin: 'anonymous',
    url: 'http://t.tilemap.jp/kishiwada/hlm/{z}/{x}/{y}.png',
    scheme: 'tms',
    maxZoom: 18
  })
});
var layer_org = new ol.layer.TileLayer({
  visible: true,
  preload: Infinity,
  source: new ol.source.XYZ({
    crossOrigin: 'anonymous',
    url: 'http://t.tilemap.jp/kishiwada/org/b6411786-2aeb-48e3-8798-cf28cd8a7b87-{z}_{x}_{y}.png',
    projection: new ol.projection.Illustmap('kishiwada',{
      extent: new ol.Extent(0,0,1514,1631)
    }),
    maxZoom: 18
  })
});

/*var layer_hlm = new ol.layer.TileLayer({
  visible: true,
  preload: Infinity,
  source: new ol.source.XYZ({
    crossOrigin: 'anonymous',
    url: 'http://t.tilemap.jp/kishiwada/hlm/{z}/{x}/{y}.png',
    scheme: 'tms',
    maxZoom: 18
  })
});*/

var layers = [
  layer_bing,
  layer_tps,
  layer_hlm
];

var map = new ol.Map({
  layers: layers,
  renderer: ol.RendererHint.CANVAS,
  target: 'map',
  view: new ol.View2D({
    center: ol.projection.transform([-123.1, 49.25], 'EPSG:4326', 'EPSG:3857'),
    zoom: 8
  })
});

var map2 = new ol.Map({
  layers: [layer_org],
  renderer: ol.RendererHint.CANVAS,
  target: 'map2',
  view: new ol.View2D({
    center: [500,500],
    zoom: 3
  })
});

var baseExtent  = new ol.Extent(135.3613, 34.4509, 135.3815, 34.4705);
var transExtent = baseExtent.transform(ol.projection.getTransform('EPSG:4326', 'EPSG:3857'));
//var sw = ol.projection.transform([135.3613, 34.4509], 'EPSG:4326', 'EPSG:3857');
//var ne = ol.projection.transform([135.3815, 34.4705], 'EPSG:4326', 'EPSG:3857');
map.getView().fitExtent(transExtent,map.getSize());

var opacity_tps = new ol.dom.Input(document.getElementById('opacity_tps'));
opacity_tps.bindTo('value', layer_tps, 'opacity');
var opacity_hlm = new ol.dom.Input(document.getElementById('opacity_hlm'));
opacity_hlm.bindTo('value', layer_hlm, 'opacity');

//$('#layer-select').change(function() {
//  var style = $(this).find(':selected').val();
//  for (var i = 0; i < layers.length; ++i) {
//    layers[i].setVisible(styles[i] == style);
//  }
//  alert(map.getView().getResolution());
//});
//$('#layer-select').trigger('change');
