/* 
 * This script generates a Landsat-8 image composite with cloud masking.
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

var collection = ee.ImageCollection('LANDSAT/LC8_L1T_TOA')
                   .select(['B2','B3','B4','B5','B6','B7'])
                   .filterDate('2015-01-01', '2016-12-31');  


/*******************************
  CLOUD MASKING FUNCTION
********************************/

var rename = function(image) {
  return image.rename(['B2','B3','B4','B5','B6','B7']);
};                   

var negative = function(image) {
  var band4 = image.expression(
    '(b2 > 0) && (b3 > 0) && (b4 > 0) && (b5 > 0) && (b6 > 0) && (b7 > 0)',
    {
        b2:   image.select('B2'),
        b3:   image.select('B3'),
        b4:   image.select('B4'),
        b5:   image.select('B5'),
        b6:   image.select('B6'),
        b7:   image.select('B7')
   });
  return image.mask(band4);
}; 

var maskCloud1 = function(image) {
  var band02 = image.select('B2').lt(0.2); // blue
  return image.mask(band02); 
};  
  
var maskClouds = function(image) {
    var expH = image.expression(
    '((nir-red)/(nir+red) < 0.6 && (red/sw2 < 1.0)) || ((nir-red)/(nir+red) >= 0.6 && (red/sw2 < 2.50)) || ((nir-red)/(nir+red) < 0.125)',
    {
        red: image.select('B4'),   // red 
        nir: image.select('B5'),   // nir
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
      bands: ['B6','B5','B4'], 
      min: [0.05, 0.05, 0.05], max: [0.30, 0.40, 0.40]
    },
    'L8 Composite'
);

/*******************************
  EXPORT IMAGE COMPOSITE
********************************/

var composite = maskedImage.median().select(['B2','B3','B4','B5','B6','B7']);

Export.image.toAsset({
  image: composite,
  description: 'Landsat_Composite_'+site+'_2015',
  region: box,
  scale: 30,
  maxPixels: 300000000,
});

