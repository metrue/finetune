const OpenAI = require('openai')
const core = require('@actions/core')
const fs = require('fs')

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

const main = async () => {
  const dataset = core.getInput('dataset')
  const wait = core.getInput('wait')
  const OPENAI_API_KEY = core.getInput('openai-api-key')
  const OPENAI_API_ORG = core.getInput('openai-api-org')
  // eslint-disable-next-line
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
    organization: OPENAI_API_ORG,
  })

  const fd = fs.createReadStream(dataset, 'utf8')
  const res = await openai.files.create(
    {
      file: fd,
      purpose: 'fine-tune',
    },
    {
      stream: false, // it has to be false to get the id of file uploaded
    },
  )

  // eslint-disable-next-line
  console.log(`dataset uploaded: ${res.filename} ${res.id} ${res.status}`)
  if (res.id) {
    core.setOutput('file-id', res.id)
    let count = 0
    while (wait) {
      count += 1
      let fileProcessed = false
      const result = await openai.files.list()
      for (const f of result.data) {
        // eslint-disable-next-line
        console.log(`${f.id} ${f.purpose} ${f.status}`)
        if (f.id === res.id) {
          core.setOutput('file-id', f.id)
          core.setOutput('file-status', f.status)
          if (f.status === 'processed') {
            fileProcessed = true
            break
          }
          if (f.status === 'error') {
            // eslint-disable-next-line
            console.log(`${f.id} ${f.purpose} ${f.status} ${f.status_details}`)
            fileProcessed = true
          }
        }
      }
      if (fileProcessed) {
        break
      } else if (count > 3) {
        throw new Error(`tried more than ${count} times `)
      } else {
        await sleep(10000)
      }
    }
  } else {
    throw new Error(`no id found for the fine tuning job`)
  }
}

main().catch((e) => {
  core.setFailed(e.message)
})
