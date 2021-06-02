const axios = require('axios').default
const fs = require('fs')
const fsAsync = fs.promises
const imageService = require('./image')
const utils = require('./utils')

const GDAL_SERVER_URL = process.env.GDAL_SERVER_URL || 'http://localhost:5000'

async function getMaskMetadata(imageId, maskId) {
	const filePath = `images/${imageId}/masks/${maskId}/metadata.json`
	if (await utils.pathExists(filePath)) {
		const data = await fsAsync.readFile(filePath)
		return JSON.parse(data)
	} else {
		return null
	}
}

async function getAllMaskMetadata(imageId) {
	const metadataList = []
	const masksPath = `images/${imageId}/masks`
	if (await utils.pathExists(masksPath)) {
		const maskIds = await fsAsync.readdir(masksPath)
		for (const maskId of maskIds) {
			const metadata = await getMaskMetadata(imageId, maskId)
			if (metadata !== null) {
				metadataList.push(metadata)
			}
		}
	}

	return metadataList
}

async function generateMask(imageId, maskId, exportType) {
	const metadata = await getMaskMetadata(imageId, maskId)

	const filePath = `images/${imageId}/masks/${maskId}/annotation_data_saved.json`
	const annotationData = await fsAsync.readFile(filePath)

	const json = {
		width: metadata.width,
		height: metadata.height,
		features: JSON.parse(annotationData).features
	}

	let url = GDAL_SERVER_URL + '/rasterize'
	if (exportType === 'grayscale') {
		url += '-grayscale'
	}

	const response = await axios.post(url, json, {
		responseType: 'stream'
	})

	return response.data
}

async function processMask(imageId, maskProperties) {
	const targetPath = `images/${imageId}/masks/${maskProperties.filename}`
	await fsAsync.mkdir(targetPath, { recursive: true })

	await imageService.saveImageMetadata(maskProperties, targetPath)
	await imageService.createThumbnail(maskProperties.path, targetPath)

	await createAnnotationData(maskProperties.path, targetPath)

	await fsAsync.unlink(maskProperties.path)
}

async function createAnnotationData(sourcePath, targetPath) {
	annotationData = JSON.stringify({
		features: await maskToGeoJson(sourcePath),
	})
	await fsAsync.writeFile(targetPath + '/annotation_data_original.json', annotationData)
	await fsAsync.writeFile(targetPath + '/annotation_data_saved.json', annotationData)
}

async function maskToGeoJson(sourcePath) {
	const stream = fs.createReadStream(sourcePath)
	const response = await axios.post(GDAL_SERVER_URL + '/polygonize', stream, {
		maxContentLength: Infinity,
		maxBodyLength: Infinity
	})
	return response.data
}

async function getAnnotationData(imageId, maskId) {
	const filePath = `images/${imageId}/masks/${maskId}/annotation_data_saved.json`
	const data = await fsAsync.readFile(filePath)
	return JSON.parse(data)
}

async function saveAnnotationData(imageId, maskId, annotationData) {
	const filePath = `images/${imageId}/masks/${maskId}/annotation_data_saved.json`
	await fsAsync.writeFile(filePath, annotationData)
}

async function resetAnnotationData(imageId, maskId) {
	const filePath = `images/${imageId}/masks/${maskId}/annotation_data_saved.json`
	const filePathOriginal = `images/${imageId}/masks/${maskId}/annotation_data_original.json`
	await fsAsync.copyFile(filePathOriginal, filePath)
}

async function deleteMask(imageId, maskId) {
	await fsAsync.rmdir(`images/${imageId}/masks/${maskId}`, { recursive: true })
}

module.exports.getMaskMetadata = getMaskMetadata
module.exports.getAllMaskMetadata = getAllMaskMetadata
module.exports.generateMask = generateMask
module.exports.processMask = processMask
module.exports.getAnnotationData = getAnnotationData
module.exports.saveAnnotationData = saveAnnotationData
module.exports.resetAnnotationData = resetAnnotationData
module.exports.deleteMask = deleteMask
