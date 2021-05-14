const gdal = require('gdal')

module.exports = function (sourcePath, targetPath, callback) {
	const sourceDataset = gdal.open(sourcePath)
	const shapefileName = 'polygons'
	const driver = gdal.drivers.get('ESRI Shapefile')
	const targetDataset = driver.create(`${targetPath}/${shapefileName}.shp`)
	const targetLayer = targetDataset.layers.create(shapefileName)

	gdal.polygonize({
		src: sourceDataset.bands.get(1),
		mask: sourceDataset.bands.get(1),
		dst: targetLayer,
		pixValField: 0
	})

	sourceDataset.close()
	targetDataset.close()

	callback()
}
