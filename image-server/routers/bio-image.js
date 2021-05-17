const express = require('express')
const multer  = require('multer')
const service = require('../services/bio-image')

const router = express.Router()
const upload = multer({ dest: 'uploads/' })

router.post('/images', upload.single('file'), async (req, res) => {
	try {
		await service.processImage(req.file)
		res.end()
	} catch (error) {
		console.error(error)
		res.sendStatus(500)
	}
})

router.get('/images/metadata', async (req, res) => {
	try {
		const metadata = await service.getAllImageMetadata()
		res.json(metadata)
	} catch (error) {
		console.error(error)
		res.sendStatus(500)
	}
})

router.delete('/images/:id', async (req, res) => {
	const id = req.params.id
	try {
		await service.deleteImage(id)
		res.end()
	} catch (error) {
		console.error(error)
		res.sendStatus(500)
	}
})

router.get('/images/:id/metadata', async (req, res) => {
	const id = req.params.id
	try {
		const data = await service.getImageMetadata(id)
		data ? res.json(data) : res.sendStatus(404)
	} catch (error) {
		console.error(error)
		res.sendStatus(500)
	}
})

router.get('/images/:id/thumbnail', (req, res) => {
	const id = req.params.id
	res.sendFile(`${__rootdir}/images/${id}/thumbnail.png`)
})

router.get('/images/:id/tiles/:z/:y/:x', (req, res) => {
	const id = req.params.id
	const z = req.params.z
	const y = req.params.y
	const x = req.params.x
	res.sendFile(`${__rootdir}/images/${id}/tiles/${z}/${y}/${x}.png`)
})

module.exports = router
