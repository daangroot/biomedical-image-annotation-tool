const express = require('express')
const multer = require('multer')
const service = require('../services/mask-image')

const router = express.Router()
const upload = multer({ dest: 'uploads/' })

router.post('/images/:imageId/masks', upload.single('file'), async (req, res) => {
	const imageId = req.params.imageId
	try {
		await service.processMask(imageId, req.file)
		res.end()
	} catch (error) {
		console.error(error)
		res.sendStatus(500)
	}
})

router.get('/images/:imageId/masks/info', async (req, res) => {
	const imageId = req.params.imageId
	try {
		const metadata = await service.getAllMaskMetadata(imageId)
		res.json(metadata)
	} catch (error) {
		console.error(error)
		res.sendStatus(500)
	}
})

router.get('/images/:imageId/masks/:maskId', async (req, res) => {
	const imageId = req.params.imageId
	const maskId = req.params.maskId
	try {
		const metadata = await service.getMaskMetadata(imageId, maskId)
		res.header('Content-Disposition', `attachment; filename="${metadata.originalName}"`)
		const stream = await service.generateMask(imageId, maskId)
		stream.pipe(res)
	} catch (error) {
		console.error(error)
		res.sendStatus(500)
	}
})

router.delete('/images/:imageId/masks/:maskId', async (req, res) => {
	const imageId = req.params.imageId
	const maskId = req.params.maskId
	try {
		await service.deleteMask(imageId, maskId)
		res.end()
	} catch (error) {
		console.error(error)
		res.sendStatus(500)
	}
})

router.get('/images/:imageId/masks/:maskId/thumbnail', (req, res) => {
	const imageId = req.params.imageId
	const maskId = req.params.maskId
	res.sendFile(`${__rootdir}/images/${imageId}/masks/${maskId}/thumbnail.png`)
})

router.get('/images/:imageId/masks/:maskId/metadata', async (req, res) => {
	const imageId = req.params.imageId
	const maskId = req.params.maskId
	try {
		const metadata = await service.getMaskMetadata(imageId, maskId)
		metadata ? res.json(metadata) : res.sendStatus(404)
	} catch (error) {
		console.error(error)
		res.sendStatus(500)
	}
})

router.get('/images/:imageId/masks/:maskId/annotation-data', async (req, res) => {
	const imageId = req.params.imageId
	const maskId = req.params.maskId
	try {
		const annotationData = await service.getAnnotationData(imageId, maskId)
		res.json(annotationData)
	} catch (error) {
		console.error(error)
		res.sendStatus(500)
	}
})

router.put('/images/:imageId/masks/:maskId/annotation-data', async (req, res) => {
	const imageId = req.params.imageId
	const maskId = req.params.maskId
	try {
		await service.saveAnnotationData(imageId, maskId, JSON.stringify(req.body))
		res.end()
	} catch (error) {
		console.error(error)
		res.sendStatus(500)
	}
})

router.delete('/images/:imageId/masks/:maskId/annotation-data', async (req, res) => {
	const imageId = req.params.imageId
	const maskId = req.params.maskId
	try {
		await service.resetAnnotationData(imageId, maskId)
		res.end()
	} catch (error) {
		console.error(error)
		res.sendStatus(500)
	}
})

module.exports = router
