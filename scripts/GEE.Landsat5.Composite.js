/*
 * This script generates a merged Landsat-5 and Landsat-7 image composite 
 * with cloud masking.
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

var collectionL5 = ee.ImageCollection('LANDSAT/LT5_L1T_TOA')
                     .select(['B1','B2','B3','B4','B5','B7'])
                     .filterDate('2009-01-01', '2011-12-31');

var collectionL7 = ee.ImageCollection('LANDSAT/LE7_L1T_TOA')
                     .select(['B1','B2','B3','B4','B5','B7'])
                     .filterDate('2009-01-01', '2011-12-31');

var collectionL5L7 = collectionL5.merge(collectionL7);
var collection = ee.ImageCollection(collectionL5L7);


/*******************************
  CLOUD MASKING FUNCTION
********************************/

var rename = function(image) {
  return image.rename(['B1','B2','B3','B4','B5','B7']);
};                   

var negative = function(image) {
  var band4 = image.expression(
    '(b1 > 0) && (b2 > 0) && (b3 > 0) && (b4 > 0) && (b5 > 0) && (b7 > 0)',
    {
        b1:   image.select('B1'),
        b2:   image.select('B2'),
        b3:   image.select('B3'),
        b4:   image.select('B4'),
        b5:   image.select('B5'),
        b7:   image.select('B7')
   });
  return image.mask(band4);
}; 

var maskCloud1 = function(image) {
  var band01 = image.select('B1').lt(0.2); // blue
  return image.mask(band01); 
};  
  
var maskClouds = function(image) {
    var expH = image.expression(
    '((nir-red)/(nir+red) < 0.6 && (red/sw2 < 1.0)) || ((nir-red)/(nir+red) >= 0.6 && (red/sw2 < 2.50)) || ((nir-red)/(nir+red) < 0.125)',
    {
        red: image.select('B3'),   // red 
        nir: image.select('B4'),   // nir
        sw2: image.select('B7')    // swir2
    }); 
 return image.mask(expH);
};

var collection = collection.map(rename);
var collection = collection.map(negative);
var collection = collection.map(maskCloud1);

// Map the cloud masking function over the collection
var maskedImage = collection.map(maskClouds);


/*******************************
  DISPLAY COMPOSITE
********************************/

Map.addLayer(maskedImage.median().clip(box),
    {
      bands: ['B5','B4','B3'], 
      min: [0.05, 0.05, 0.05], max: [0.30, 0.40, 0.40]
    },
    'L5 Composite'
);

/*******************************
  EXPORT IMAGE COMPOSITE
********************************/

var composite = maskedImage.median().select(['B1','B2','B3','B4','B5','B7']);

Export.image.toAsset({
  image: composite,
  description: 'Landsat_Composite_'+site+'_2010',
  region: box,
  scale: 30,
  maxPixels: 300000000,
});

