/*
 * This script implements a land cover classification of combined Landsat, ALOS/PALSAR-1,
 * and ALOS/PALSAR-2 images over Northern Negros Island Province, Philippines at two
 * time points for the years 2007 and 2015. The combined Landsat and SAR images
 * were classified with 5 classes namely: Forestland, Settlements, Cropland, Wetland, 
 * and Grassland.
 *
 */

/*******************************
  DEFINE USER INPUTS
********************************/

var seed = 2015; // Random seed
var site = "NNegros"; // Name of study site


/*******************************
  DEFINE EXTENT AND VIEW
********************************/

// Define and display box covering extent of study area
var box = ee.Geometry.Rectangle(122.78,11.0, 123.58,10.3);
Map.centerObject(box, 10); // Zoom in and center display to study area
Map.addLayer(box, {'color': 'FF0000'}, 'Box Extents', false);


/*******************************
  LOAD DATASETS
********************************/

// LANDSAT
var ls2010 = ee.Image('users/dondealban/Landsat_Composite_NNegros_2010');
var ls2015 = ee.Image('users/dondealban/Landsat_Composite_NNegros_2015')
               .select([0,1,2,3,4,5],['B1','B2','B3','B4','B5','B7']); // rename L8 bands

// PALSAR (Please note that no speckle filtering has been applied yet)
var ps2010 = ee.Image('users/dondealban/PALSAR_Composite_NNegros_2010');
var ps2015 = ee.Image('users/dondealban/PALSAR_Composite_NNegros_2015');


/*******************************
  GENERATE INDICES
********************************/

// Calculate Landsat enhanced vegetation indices (EVI; Huete et al. 1997, 2002)
var evi2010  = ls2010.expression('2.5 * ((b("B4") - b("B3")) / (b("B4") + 6 * b("B3") - 7.5 * b("B1") + 1))').rename('EVI'); 
var evi2015  = ls2015.expression('2.5 * ((b("B4") - b("B3")) / (b("B4") + 6 * b("B3") - 7.5 * b("B1") + 1))').rename('EVI'); 

// Calculate Landsat land surface water indices (LSWI; Gao 1996, Jurgens 1997)
var lswi2010 = ls2010.normalizedDifference(['B4', 'B5']).rename('LSWI'); 
var lswi2015 = ls2015.normalizedDifference(['B4', 'B5']).rename('LSWI'); 

// Calculate Landsat normalised difference till indices (NDTI; Van Deventer 1997)
var ndti2010 = ls2010.normalizedDifference(['B5', 'B7']).rename('NDTI'); 
var ndti2015 = ls2015.normalizedDifference(['B5', 'B7']).rename('NDTI');

// Calculate Landsat normalised difference vegetation indices (NDVI; Rouse et al. 1974)
var ndvi2010 = ls2010.normalizedDifference(['B4', 'B3']).rename('NDVI'); 
var ndvi2015 = ls2015.normalizedDifference(['B4', 'B3']).rename('NDVI'); 

// Calculate Landsat soil-adjusted total vegetation indices (SATVI; Marsett et al. 2006)
var stvi2010 = ls2010.expression('((b("B5") - b("B3")) / (b("B5") + b("B3") + 0.1)) * (1.1 - (b("B7") / 2))').rename('SATVI');
var stvi2015 = ls2015.expression('((b("B5") - b("B3")) / (b("B5") + b("B3") + 0.1)) * (1.1 - (b("B7") / 2))').rename('SATVI');


/*******************************
  CALCULATE TEXTURES
********************************/

// Rescale floating point to integer
var scaledhh2010 = ps2010.expression('1000*b("HH")').int32().rename('HH');
var scaledhv2010 = ps2010.expression('1000*b("HV")').int32().rename('HV');
var scaledhh2015 = ps2015.expression('1000*b("HH")').int32().rename('HH');
var scaledhv2015 = ps2015.expression('1000*b("HV")').int32().rename('HV');

// Stack rescaled Sigma0 channels
var dual2010 = scaledhh2010.addBands(scaledhv2010);
var dual2015 = scaledhh2015.addBands(scaledhv2015);

// Calculate GLCM texture measures
var textureMeasures = ['HH_asm', 'HH_contrast', 'HH_corr', 'HH_var', 'HH_idm', 'HH_savg', 'HH_ent', 'HH_diss',
                       'HV_asm', 'HV_contrast', 'HV_corr', 'HV_var', 'HV_idm', 'HV_savg', 'HV_ent', 'HV_diss'];
var glcm2010 = dual2010.glcmTexture({size: 1, average: true }).select(textureMeasures);  // 3x3 kernel
var glcm2015 = dual2015.glcmTexture({size: 1, average: true }).select(textureMeasures);  // 3x3 kernel


/*******************************
  CREATE COMPOSITE STACK
********************************/

// Create image collection from images
var stack2010 = ls2010.addBands(evi2010).addBands(lswi2010).addBands(ndti2010).addBands(ndvi2010).addBands(stvi2010)
                      .addBands(ps2010).addBands(glcm2010);
var stack2015 = ls2015.addBands(evi2015).addBands(lswi2015).addBands(ndti2015).addBands(ndvi2015).addBands(stvi2015)
                      .addBands(ps2015).addBands(glcm2015);
var bands = ['B1', 'B2', 'B3', 'B4', 'B5', 'B7', 'EVI', 'LSWI', 'NDTI', 'NDVI', 'SATVI', 
             'HH', 'HV', 'RAT',
             'HH_asm', 'HH_contrast', 'HH_corr', 'HH_var', 'HH_idm', 'HH_savg', 'HH_ent', 'HH_diss',
             'HV_asm', 'HV_contrast', 'HV_corr', 'HV_var', 'HV_idm', 'HV_savg', 'HV_ent', 'HV_diss'];


/*******************************
  DEFINE REGIONS OF INTEREST
********************************/

var points = ee.FeatureCollection('users/dondealban/Philippines/ALOSKC4/NNG/nnegros-landcover-roi-final');
Map.addLayer(points, {'color': '1E90FF'}, site+'_ROI');

// Initialise random column and values for ROI feature collection 
points = points.randomColumn('random', seed);

var train = points.filter(ee.Filter.lte('random', 0.7));
var test  = points.filter(ee.Filter.gt('random', 0.7));

Map.addLayer(train, {'color': '000000'}, 'ROI Train', true); 
Map.addLayer(test,  {'color': 'FF0000'}, 'ROI Test', true); 

// Create training ROIs from the image dataset
var train2010 = stack2010.select(bands).sampleRegions({
	collection: train,
	properties: ['ClassID2', 'random'],
	scale: 30
});
var train2015 = stack2015.select(bands).sampleRegions({
	collection: train,
	properties: ['ClassID2', 'random'],
	scale: 30
});

// Create testing ROIs from the image dataset
var tests2010 = stack2010.select(bands).sampleRegions({
	collection: test,
	properties: ['ClassID2', 'random'],
	scale: 30
});
var tests2015 = stack2015.select(bands).sampleRegions({
	collection: test,
	properties: ['ClassID2', 'random'],
	scale: 30
});


// Print number of regions of interest for training and testing at the console 
print('Training, n =', train2015.aggregate_count('.all'));
print('Testing, n =',  tests2015.aggregate_count('.all'));


/*******************************
  EXECUTE CLASSIFICATION
********************************/

// 2010

// Classification using Random Forest algorithm
var classifier2010 = ee.Classifier.randomForest(100,0,10,0.5,false,seed).train({
  features: train2010.select(['B1', 'B2', 'B3', 'B4', 'B5', 'B7', 'EVI', 'LSWI', 'NDTI', 'NDVI', 'SATVI', 
                              'HH', 'HV', 'RAT', 'NDI', 'NLI',
                              'HH_asm', 'HH_contrast', 'HH_corr', 'HH_var', 'HH_idm', 'HH_savg', 'HH_ent', 'HH_diss',
                              'HV_asm', 'HV_contrast', 'HV_corr', 'HV_var', 'HV_idm', 'HV_savg', 'HV_ent', 'HV_diss',
                              'ClassID2']),
  classProperty: 'ClassID2', 
  inputProperties: bands
});

// Classify the validation data
var validation2010 = tests2010.classify(classifier2010);

// Calculate accuracy metrics
var em2010 = validation2010.errorMatrix('ClassID2', 'classification'); // Error matrix
var oa2010 = em2010.accuracy(); // Overall accuracy
var ua2010 = em2010.consumersAccuracy().project([1]); // Consumer's accuracy
var pa2010 = em2010.producersAccuracy().project([0]); // Producer's accuracy
var fs2010 = (ua2010.multiply(pa2010).multiply(2.0)).divide(ua2010.add(pa2010)); // F1-statistic

print('Error Matrix, 2010:', em2010);
print('OA, 2010:', oa2010);
print('UA, 2010 (rows):', ua2010);
print('PA, 2010 (cols):', pa2010);
print('F1, 2010: ', fs2010);

// Classify the image Random Forest algorithm
var classified2010 = stack2010.select(bands).classify(classifier2010);


// 2015

// Classification using Random Forest algorithm
var classifier2015 = ee.Classifier.randomForest(100,0,10,0.5,false,seed).train({
  features: train2015.select(['B1', 'B2', 'B3', 'B4', 'B5', 'B7', 'EVI', 'LSWI', 'NDTI', 'NDVI', 'SATVI', 
                              'HH', 'HV', 'RAT', 'NDI', 'NLI',
                              'HH_asm', 'HH_contrast', 'HH_corr', 'HH_var', 'HH_idm', 'HH_savg', 'HH_ent', 'HH_diss',
                              'HV_asm', 'HV_contrast', 'HV_corr', 'HV_var', 'HV_idm', 'HV_savg', 'HV_ent', 'HV_diss',
                              'ClassID2']),
  classProperty: 'ClassID2', 
  inputProperties: bands
});

// Classify the validation data
var validation2015 = tests2015.classify(classifier2015);

// Calculate accuracy metrics
var em2015 = validation2015.errorMatrix('ClassID2', 'classification'); // Error matrix
var oa2015 = em2015.accuracy(); // Overall accuracy
var ua2015 = em2015.consumersAccuracy().project([1]); // Consumer's accuracy
var pa2015 = em2015.producersAccuracy().project([0]); // Producer's accuracy
var fs2015 = (ua2015.multiply(pa2015).multiply(2.0)).divide(ua2015.add(pa2015)); // F1-statistic

print('Error Matrix, 2015:', em2015);
print('OA, 2015:', oa2015);
print('UA, 2015 (rows):', ua2015);
print('PA, 2015 (cols):', pa2015);
print('F1, 2015: ', fs2015);

// Classify the image Random Forest algorithm
var classified2015 = stack2015.select(bands).classify(classifier2015);


/*******************************
  FILTER CLASSIFICATION
********************************/

// Increase land cover class values by 1
classified2010 = classified2010.add(1);
classified2015 = classified2015.add(1);

// Perform a mode filter on the classified image
var filtered2010 = classified2010.reduceNeighborhood({
  reducer: ee.Reducer.mode(),
  kernel: ee.Kernel.square(1),
});
var filtered2015 = classified2015.reduceNeighborhood({
  reducer: ee.Reducer.mode(),
  kernel: ee.Kernel.square(1),
});


/*******************************
  APPLY WATER MASK  
********************************/

// Load the Hansen et al. global forest cover change dataset
var gfcImage = ee.Image('UMD/hansen/global_forest_change_2015').clip(box);

// Select the land/water mask
var datamask = gfcImage.select('datamask');

// Create a binary mask
var maskWater = datamask.eq(1);

// Mask out water areas from the classified images with the mask layer
var masked2010 = filtered2010.updateMask(maskWater);
var masked2015 = filtered2015.updateMask(maskWater);


/*******************************
  DISPLAY IMAGES
********************************/

// Display RGB composites of PALSAR mosaic data at three time points
Map.addLayer(ls2010, {bands: ['B5', 'B4', 'B3'], min: 0.05, max: [0.3,0.4,0.4], gamma: 1.6}, 'RGB 2010 Landsat', false);
Map.addLayer(ls2015, {bands: ['B5', 'B4', 'B3'], min: 0.05, max: [0.3,0.4,0.4], gamma: 1.6}, 'RGB 2015 Landsat', false);

// Display RGB composites of PALSAR mosaic data at three time points
Map.addLayer(ps2010, {min: [-30, -30, -5], max: [0, 0, 5]}, 'RGB 2010 PALSAR', false);
Map.addLayer(ps2015, {min: [-30, -30, -5], max: [0, 0, 5]}, 'RGB 2015 PALSAR', false);


/*******************************
  DISPLAY CLASSIFICATION 
********************************/

// Display classified image
var classPalette = ['ffffff',  // No data
                    '246a24',  // Forestland
                    'ff0000',  // Settlement
                    'a65400',  // Cropland
                    '66ccff',  // Wetland
                    'ffff66']; // Grassland
Map.addLayer(masked2010, {min: 0, max: 5, palette: classPalette}, '2010 Classification',  true);
Map.addLayer(masked2015, {min: 0, max: 5, palette: classPalette}, '2015 Classification',  true);

// Define classification legend
var colors = ['ffffff','246a24','ff0000','a65400','66ccff','ffff66'];
var names = ["No data",
             "Forestland",
             "Settlement",
             "Cropland",
             "Wetland",
             "Grassland"];
var legend = ui.Panel({style: {position: 'bottom-left'}});
legend.add(ui.Label({
  value: "Land Cover Classification",
  style: {
    fontWeight: 'bold',
    fontSize: '14px',
    margin: '0 0 4px 0',
    padding: '0px'
  }
}));

// Iterate classification legend entries
var entry;
for (var x = 0; x<6; x++){
  entry = [
    ui.Label({style:{color:colors[x],margin: '0 0 4px 0'}, value: '██'}),
    ui.Label({
      value: names[x],
      style: {
        margin: '0 0 4px 4px'
      }
    })
  ];
  legend.add(ui.Panel(entry, ui.Panel.Layout.Flow('horizontal')));
}

// Display classification legend
Map.add(legend);


/*******************************
  EXPORT IMAGES &  TABLES
********************************/

// Export masked filtered classified images
Export.image.toDrive({
  image: masked2010.uint8(), 
  description: 'Classification_'+site+'_2010',
  folder: 'Google Earth Engine',
  region: box,
  scale: 30,
  maxPixels: 300000000,
});
Export.image.toDrive({
  image: masked2015.uint8(), 
  description: 'Classification_'+site+'_2015',
  folder: 'Google Earth Engine',
  region: box,
  scale: 30,
  maxPixels: 300000000,
});

