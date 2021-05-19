const fs = require('fs')
const fsAsync = fs.promises
const sharp = require('sharp')
const imageService = require('./image')
const utils = require('./utils')

async function getImageMetadata(id) {
	const filePath = `images/${id}/metadata.json`
	if (await utils.pathExists(filePath)) {
		const data = await fsAsync.readFile(filePath)
		return JSON.parse(data)
	} else {
		return null
	}
}

async function getAllImageMetadata() {
	if (await utils.pathExists('images')) {
		const ids = await fsAsync.readdir('images')
		return await Promise.all(ids.map(async id => {
			return await getImageMetadata(id)
		}))
	} else {
		return []
	}
}

async function processImage(imageProperties) {
	const targetPath = 'images/' + imageProperties.filename
	await fsAsync.mkdir(targetPath, { recursive: true })

	await imageService.saveImageMetadata(imageProperties, targetPath)
	await imageService.createThumbnail(imageProperties.path, targetPath)

	await convertToTiles(imageProperties.path, targetPath)

	await fsAsync.unlink(imageProperties.path)
}

async function convertToTiles(sourcePath, targetPath) {
	await sharp(sourcePath, { limitInputPixels: false })
		.png()
		.tile({
			layout: 'google',
			size: 128,
			background: { r: 221, g: 221, b: 221 }
		})
		.toFile(targetPath + '/tiles')
}

async function deleteImage(id) {
	await fsAsync.rmdir(`images/${id}`, { recursive: true })
}

module.exports.getImageMetadata = getImageMetadata
module.exports.getAllImageMetadata = getAllImageMetadata
module.exports.processImage = processImage
module.exports.deleteImage = deleteImage
