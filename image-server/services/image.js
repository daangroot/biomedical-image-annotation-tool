const fsAsync = require('fs').promises
const imageSize = require('image-size')
const sharp = require('sharp')

async function saveImageMetadata(metaData, targetPath) {
	const dimensions = imageSize(metaData.path)
	const data = {
		id: metaData.filename,
		originalName: metaData.originalname,
		encoding: metaData.encoding,
		mimeType: metaData.mimetype,
		width: dimensions.width,
		height: dimensions.height,
		size: metaData.size
	}
	const json = JSON.stringify(data)
	await fsAsync.writeFile(targetPath + '/metadata.json', json, 'utf8')
}

async function createThumbnail(sourcePath, targetPath) {
	const options = {}
	const dimensions = imageSize(sourcePath)
	if (dimensions.width > dimensions.height) {
		options.width = 256
	} else {
		options.height = 256
	}

	await sharp(sourcePath, { limitInputPixels: false })
		.resize(options)
		.toFile(targetPath + '/thumbnail.png')
}

module.exports.saveImageMetadata = saveImageMetadata
module.exports.createThumbnail = createThumbnail
