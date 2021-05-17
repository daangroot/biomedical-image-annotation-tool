const axios = require('axios').default
const FormData = require('form-data')
const fs = require('fs')
const imageService = require('./image')

const fsAsync = fs.promises

const GDAL_SERVER_URL = 'http://localhost:5000'

async function pathExists(path) {
	try {
		await fsAsync.access(path, fs.constants.F_OK)
		return true
	} catch {
		return false
	}
}

async function getMaskImageInfo(bioImageId, maskId) {
	const filePath = `images/${bioImageId}/masks/${maskId}/info.json`
	if (await pathExists(filePath)) {
		const data = await fsAsync.readFile(filePath)
		return JSON.parse(data)
	} else {
		return null
	}
}

async function getAllMaskImageInfo(bioImageId) {
	const maskInfos = []
	const masksPath = `images/${bioImageId}/masks`
	if (await pathExists(masksPath)) {
		const maskIds = await fsAsync.readdir(masksPath)
		for (const maskId of maskIds) {
			const maskInfo = await getMaskImageInfo(bioImageId, maskId)
			if (maskInfo !== null) {
				maskInfos.push(maskInfo)
			}
		}
	}

	return maskInfos
}

async function processMaskImage(bioImageId, imageData) {
	const targetPath = `images/${bioImageId}/masks/${imageData.filename}`
	await fsAsync.mkdir(targetPath, { recursive: true })

	await imageService.saveImageInfo(imageData, targetPath)
	await imageService.createThumbnail(imageData.path, targetPath)

	await maskToGeoJson(imageData.path, targetPath)

	const metadata = { overallScore: null }
	await fsAsync.writeFile(targetPath + '/metadata.json', JSON.stringify(metadata))

	await fsAsync.unlink(imageData.path)
}

async function maskToGeoJson(sourcePath, targetPath) {
	const form = new FormData()
	form.append('file', fs.createReadStream(sourcePath))

	const response = await axios.post(GDAL_SERVER_URL + '/polygonize', form, {
		headers: form.getHeaders()
	})

	const json = JSON.stringify(response.data)
	await fsAsync.writeFile(targetPath + '/geojson.json', json)
}

async function getGeoJson(bioImageId, maskId) {
	const filePath = `images/${bioImageId}/masks/${maskId}/geojson_updated.json`
	const filePathOriginal = `images/${bioImageId}/masks/${maskId}/geojson.json`
	if (await pathExists(filePath)) {
		const data = await fsAsync.readFile(filePath)
		return JSON.parse(data)
	} else if (await pathExists(filePathOriginal)) {
		const data = await fsAsync.readFile(filePathOriginal)
		return JSON.parse(data)
	} else {
		return null
	}
}

async function saveGeoJson(bioImageId, maskId, json) {
	const filePath = `images/${bioImageId}/masks/${maskId}/geojson_updated.json`
	await fsAsync.writeFile(filePath, json)
}

async function deleteGeoJson(bioImageId, maskId) {
	const filePath = `images/${bioImageId}/masks/${maskId}/geojson_updated.json`
	if (await pathExists(filePath)) {
		await fsAsync.unlink(filePath);
	}
}

async function getMetadata(bioImageId, maskId) {
	const filePath = `images/${bioImageId}/masks/${maskId}/metadata.json`
	if (await pathExists(filePath)) {
		const data = await fsAsync.readFile(filePath)
		return JSON.parse(data)
	} else {
		return null
	}
}

async function saveMetadata(bioImageId, maskId, json) {
	const filePath = `images/${bioImageId}/masks/${maskId}/metadata.json`
	await fsAsync.writeFile(filePath, json)
}

async function deleteMaskImage(bioImageId, maskId) {
	await fsAsync.rmdir(`images/${bioImageId}/masks/${maskId}`, { recursive: true })
}

module.exports.getMaskImageInfo = getMaskImageInfo
module.exports.getAllMaskImageInfo = getAllMaskImageInfo
module.exports.processMaskImage = processMaskImage
module.exports.getGeoJson = getGeoJson
module.exports.saveGeoJson = saveGeoJson
module.exports.deleteGeoJson = deleteGeoJson
module.exports.getMetadata = getMetadata
module.exports.saveMetadata = saveMetadata
module.exports.deleteMaskImage = deleteMaskImage
