const express = require('express')
const multer = require('multer')
const service = require('../services/mask-image')

const router = express.Router()
const upload = multer({ dest: 'uploads/' })

router.post('/images/:id/masks', upload.single('file'), async (req, res) => {
	const bioImageId = req.params.id
	try {
		await service.processMaskImage(bioImageId, req.file)
		res.end()
	} catch (error) {
		console.error(error)
		res.sendStatus(500)
	}
})

router.get('/images/:id/masks/info', async (req, res) => {
	const bioImageId = req.params.id
	try {
		const allMaskImageInfo = await service.getAllMaskImageInfo(bioImageId)
		res.json(allMaskImageInfo)
	} catch (error) {
		console.error(error)
		res.sendStatus(500)
	}
})

router.get('/images/:id/masks/:maskId', async (req, res) => {
	const bioImageId = req.params.id
	const maskId = req.params.maskId
	try {
		const maskInfo = await service.getMaskImageInfo(bioImageId, maskId)
		res.header('Content-Disposition', `attachment; filename="${maskInfo.originalName}"`)
		const stream = await service.generateMaskImage(bioImageId, maskId)
		stream.pipe(res)
	} catch (error) {
		console.error(error)
		res.sendStatus(500)
	}
})

router.delete('/images/:id/masks/:maskId', async (req, res) => {
	const bioImageId = req.params.id
	const maskId = req.params.maskId
	try {
		await service.deleteMaskImage(bioImageId, maskId)
		res.end()
	} catch (error) {
		console.error(error)
		res.sendStatus(500)
	}
})

router.get('/images/:id/masks/:maskId/thumbnail', (req, res) => {
	const bioImageId = req.params.id
	const maskId = req.params.maskId
	res.sendFile(`${__rootdir}/images/${bioImageId}/masks/${maskId}/thumbnail.png`)
})

router.get('/images/:id/masks/:maskId/info', async (req, res) => {
	const bioImageId = req.params.id
	const maskId = req.params.maskId
	try {
		const data = await service.getMaskImageInfo(bioImageId, maskId)
		data ? res.json(data) : res.sendStatus(404)
	} catch (error) {
		console.error(error)
		res.sendStatus(500)
	}
})

router.get('/images/:id/masks/:maskId/geojson', async (req, res) => {
	const bioImageId = req.params.id
	const maskId = req.params.maskId
	try {
		const data = await service.getGeoJson(bioImageId, maskId)
		data ? res.json(data) : res.sendStatus(404)
	} catch (error) {
		console.error(error)
		res.sendStatus(500)
	}
})

router.put('/images/:id/masks/:maskId/geojson', async (req, res) => {
	const bioImageId = req.params.id
	const maskId = req.params.maskId
	try {
		await service.saveGeoJson(bioImageId, maskId, JSON.stringify(req.body))
		res.end()
	} catch (error) {
		console.error(error)
		res.sendStatus(500)
	}
})

router.delete('/images/:id/masks/:maskId/geojson', async (req, res) => {
	const bioImageId = req.params.id
	const maskId = req.params.maskId
	try {
		await service.resetGeoJson(bioImageId, maskId)
		res.end()
	} catch (error) {
		console.error(error)
		res.sendStatus(500)
	}
})

router.get('/images/:id/masks/:maskId/metadata', async (req, res) => {
	const bioImageId = req.params.id
	const maskId = req.params.maskId
	try {
		const data = await service.getMetadata(bioImageId, maskId)
		res.json(data)
	} catch (error) {
		console.error(error)
		res.sendStatus(500)
	}
})

router.put('/images/:id/masks/:maskId/metadata', async (req, res) => {
	const bioImageId = req.params.id
	const maskId = req.params.maskId
	try {
		await service.saveMetadata(bioImageId, maskId, JSON.stringify(req.body))
		res.end()
	} catch (error) {
		console.log(error)
		res.sendStatus(500)
	}
})

module.exports = router
