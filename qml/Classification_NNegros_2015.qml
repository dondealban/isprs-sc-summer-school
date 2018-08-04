<!DOCTYPE qgis PUBLIC 'http://mrcc.com/qgis.dtd' 'SYSTEM'>
<qgis version="2.18.2" minimumScale="inf" maximumScale="1e+08" hasScaleBasedVisibilityFlag="0">
  <pipe>
    <rasterrenderer opacity="1" alphaBand="-1" classificationMax="5" classificationMinMaxOrigin="CumulativeCutFullExtentEstimated" band="1" classificationMin="0" type="singlebandpseudocolor">
      <rasterTransparency/>
      <rastershader>
        <colorrampshader colorRampType="INTERPOLATED" clip="0">
          <item alpha="255" value="0" label="No Data" color="#ffffff"/>
          <item alpha="255" value="1" label="Forestland" color="#246a24"/>
          <item alpha="255" value="2" label="Settlements" color="#ff0000"/>
          <item alpha="255" value="3" label="Cropland" color="#a65400"/>
          <item alpha="255" value="4" label="Wetland" color="#66ccff"/>
          <item alpha="255" value="5" label="Grassland" color="#ffff66"/>
        </colorrampshader>
      </rastershader>
    </rasterrenderer>
    <brightnesscontrast brightness="0" contrast="0"/>
    <huesaturation colorizeGreen="128" colorizeOn="0" colorizeRed="255" colorizeBlue="128" grayscaleMode="0" saturation="0" colorizeStrength="100"/>
    <rasterresampler maxOversampling="2"/>
  </pipe>
  <blendMode>0</blendMode>
</qgis>
