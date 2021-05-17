const fs = require('fs')
const sharp = require('sharp')
const imageService = require('./image')
const utils = require('./utils')

const fsAsync = fs.promises

async function getBioImageInfo(id) {
	const filePath = `images/${id}/info.json`
	if (await utils.pathExists(filePath)) {
		const data = await fsAsync.readFile(filePath)
		return JSON.parse(data)
	} else {
		return null
	}
}

async function getAllBioImageInfo() {
	if (await utils.pathExists('images')) {
		const ids = await fsAsync.readdir('images')
		return await Promise.all(ids.map(async id => {
			return await getBioImageInfo(id)
		}))
	} else {
		return []
	}
}

async function processBioImage(imageData) {
	const targetPath = 'images/' + imageData.filename
	await fsAsync.mkdir(targetPath, { recursive: true })
	await imageService.saveImageInfo(imageData, targetPath)
	await imageService.createThumbnail(imageData.path, targetPath)
	await convertToTiles(imageData.path, targetPath)
	await fsAsync.unlink(imageData.path)
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

async function deleteBioImage(id) {
	await fsAsync.rmdir(`images/${id}`, { recursive: true })
}

module.exports.getBioImageInfo = getBioImageInfo
module.exports.getAllBioImageInfo = getAllBioImageInfo
module.exports.processBioImage = processBioImage
module.exports.deleteBioImage = deleteBioImage
