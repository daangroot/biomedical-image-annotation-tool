const fs = require('fs')
const fsAsync = fs.promises

async function pathExists(path) {
	try {
		await fsAsync.access(path, fs.constants.F_OK)
		return true
	} catch {
		return false
	}
}

module.exports.pathExists = pathExists
