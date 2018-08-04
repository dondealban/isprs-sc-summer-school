/* 
 * This script generates a PALSAR-2 image composite with cloud masking.
 *
 */


/*******************************
  DEFINE EXTENT AND VIEW
********************************/

var site = "NNegros"; // Name of study site
var box = ee.Geometry.Rectangle(122.78,11.0, 123.58,10.3);
Map.centerObject(box, 10); // Zoom in and center display to study area
Map.addLayer(box, {'color': 'FF0000'}, 'Box Extents', false);


/*******************************
  LOAD IMAGE COLLECTIONS
********************************/

var hh = ee.Image("JAXA/ALOS/PALSAR/YEARLY/SAR/2015").select(['HH']);
var hv = ee.Image("JAXA/ALOS/PALSAR/YEARLY/SAR/2015").select(['HV']);


/*******************************
  CALCULATE GAMMA-NAUGHT
********************************/

var gamma0_hh = ((((hh.multiply(hh)).log10()).multiply(10)).subtract(83)).rename('HH');
var gamma0_hv = ((((hv.multiply(hv)).log10()).multiply(10)).subtract(83)).rename('HV');
var gamma0_rat = gamma0_hh.divide(gamma0_hv).rename('RAT');
var composite = gamma0_hh.addBands(gamma0_hv).addBands(gamma0_rat);


/*******************************
  DISPLAY COMPOSITE
********************************/

Map.addLayer(composite.clip(box), 
    {
      bands: ['HH','HV','RAT'], 
      min: [-30,-30,-5], max: [0,0,5]
    }, 
    'P2 Composite'
);


/*******************************
  EXPORT IMAGE COMPOSITE
********************************/

Export.image.toAsset({
  image: composite,
  description: 'PALSAR_Composite_'+site+'_2015',
  region: box,
  scale: 30,
  maxPixels: 300000000,
});

