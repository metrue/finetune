const OpenAI = require('openai')
const core = require('@actions/core')
const fs = require('fs')

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

const main = async () => {
  // `who-to-greet` input defined in action metadata file
  const dataset = core.getInput('dataset')
  const OPENAI_API_KEY = core.getInput('openai-api-key')
  const OPENAI_API_ORG = core.getInput('openai-api-org')
  const datasetWaitTime = core.getInput('dataset-wait-time')
  const jobWaitTime = core.getInput('job-wait-time')
  // eslint-disable-next-line
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
    organization: OPENAI_API_ORG,
  })

  // upload dataset
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
  if (!res.id) {
    throw new Error(`no id found for the fine tuning job`)
  }

  const INTERVAL = 10000 // 10s

  let datasetWait = 0
  let fileProcessed = false
  while (datasetWait < datasetWaitTime) {
    await sleep(INTERVAL)
    datasetWait += INTERVAL
    const result = await openai.files.list()
    for (const f of result.data) {
      if (f.id === res.id) {
        if (f.status === 'processed') {
          // eslint-disable-next-line
          console.log(`${f.id} ${f.purpose} ${f.status}`)
          fileProcessed = true
          break
        }
        if (f.status === 'error') {
          // eslint-disable-next-line
          console.log(`${f.id} ${f.purpose} ${f.status} ${f.status_details}`)
          throw new Error(`dataset processed failed: ${f.status_details}`)
        }
      }
    }
    if (fileProcessed) {
      break
    }
  }

  if (!fileProcessed) {
    throw new Error(`tried more than ${datasetWaitTime}, but dataset not ready`)
  }

  // create fine tuning job
  // eslint-disable-next-line
  const job = await openai.fineTuning.jobs.create({
    model: 'gpt-3.5-turbo',
    training_file: res.id,
  })

  if (!job.id) {
    throw new Error(`no job found for the fine tuning job`)
  }

  let jobWait = 0
  let terminated = false
  let jobSucceeded = false
  while (jobWait < jobWaitTime) {
    await sleep(INTERVAL)
    jobWait += INTERVAL

    const res = await openai.fineTunes.list()
    for (const job of res.data) {
      const { id, status, model } = job
      if (id === job.id) {
        /*
         * The current status of the fine-tuning job, which can be either `created`,
         * `pending`, `running`, `succeeded`, `failed`, or `cancelled`.
         */
        core.setOutput('model', model)
        core.setOutput('status', status)
        // eslint-disable-next-line
        console.log(`${id} ${model} ${status}`)
        if (status === 'succeeded') {
          terminated = true
          jobSucceeded = true
          break
        }
        if (status === 'failed' || status === 'cancelled') {
          terminated = true
          jobSucceeded = false
          break
        }
      }
    }

    if (terminated) {
      break
    }
  }
  if (!jobSucceeded) {
    throw new Error(`job not succeeded after ${jobWait} time elapsed`)
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
