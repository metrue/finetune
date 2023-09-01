const OpenAI = require('openai')
const core = require('@actions/core')
const fs = require('fs')
//const github = require('@actions/github')

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

const untilFilesProcessed = async (openai, fileId) => {
  let fileProcessed = false
  const res = await openai.files.list()
  for (const f of res.data) {
    const { status, id, purpose } = f
    // eslint-disable-next-line
    console.log(`${id} ${purpose} ${status}`)
    if (id === fileId && status !== 'processed') {
      fileProcessed = true
    }
  }

  if (!fileProcessed) {
    await sleep(30000)
    return untilFilesProcessed(openai, fileId)
  }
  return true
}

const untilFineTuningJobCompleted = async (openai, jobId) => {
  let jobCompleted = false
  let modelTrained = ''
  const res = await openai.fineTunes.list()
  for (const job of res.data) {
    const { id, status, model } = job
    if (id === jobId && status == 'succeeded`') {
      jobCompleted = true
      modelTrained = model
    }
  }

  if (!jobCompleted) {
    await sleep(30000)
    return untilFineTuningJobCompleted(openai, jobId)
  }
  return modelTrained
}

const main = async () => {
  // `who-to-greet` input defined in action metadata file
  const dataset = core.getInput('dataset')
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
    await untilFilesProcessed(openai, res.id)
  } else {
    throw new Error(`no id found for the dataset uploaded`)
  }

  const job = await openai.fineTuning.jobs.create({
    model: 'gpt-3.5-turbo',
    training_file: res.id,
  })

  if (job.id) {
    const model = await untilFineTuningJobCompleted(openai, job.id)
    core.setOutput('model', model)
  } else {
    throw new Error(`no id found for the fine tuning job`)
  }
}

main()
  .then((data) => {
    // eslint-disable-next-line
    console.log(data)
  })
  .catch((e) => {
    core.setFailed(e.message)
  })
