const express = require('express')
const cors = require('cors')
const bioImageRouter = require('./routers/bio-image')
const maskImageRouter = require('./routers/mask-image')

const app = express()
const port = 8080

global.__rootdir = __dirname

app.use(express.json({
  limit: '100mb'
}))
app.use(cors())
app.use('/api', bioImageRouter)
app.use('/api', maskImageRouter)

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`)
})
