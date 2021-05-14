const fsAsync = require('fs').promises
const imageSize = require('image-size')
const sharp = require('sharp')

async function saveImageInfo(imageData, targetPath) {
	const dimensions = imageSize(imageData.path)
	const data = {
		id: imageData.filename,
		originalName: imageData.originalname,
		encoding: imageData.encoding,
		mimeType: imageData.mimetype,
		width: dimensions.width,
		height: dimensions.height,
		size: imageData.size
	}
	const json = JSON.stringify(data)
	await fsAsync.writeFile(targetPath + '/info.json', json, 'utf8')
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

module.exports.saveImageInfo = saveImageInfo
module.exports.createThumbnail = createThumbnail
