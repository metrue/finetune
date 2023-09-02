const OpenAI = require('openai')
const core = require('@actions/core')

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

const main = async () => {
  const fileId = core.getInput('file-id')
  const fileStatus = core.getInput('file-status')
  const wait = core.getInput('wait')
  const OPENAI_API_KEY = core.getInput('openai-api-key')
  const OPENAI_API_ORG = core.getInput('openai-api-org')

  if (!fileId) {
    throw new Error('the file id of dataset is required for fine tuning job creation')
  }

  if (fileStatus !== 'processed') {
    throw new Error(`dataset file not processed`)
  }

  // eslint-disable-next-line
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
    organization: OPENAI_API_ORG,
  })

  const job = await openai.fineTuning.jobs.create({
    model: 'gpt-3.5-turbo',
    training_file: fileId,
  })

  console.warn(`wait: ${wait}`)
  if (job.id) {
    console.warn(`job: ${job.id} ${job.model} ${job.status}`)
    core.setOutput('model', job.model)

    let count = 0
    while (wait) {
      count += 1
      let done = false
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
          if (status === 'succeeded') {
            done = true
            break
          }
          if (status === 'failed' || status === 'cancelled') {
            done = true
          }
        }
      }
      if (done) {
        break
      } else if (count > 3) {
        // eslint-disable-next-line
        console.log(`tried more than ${count} times`)
        throw new Error(`tried more than ${count} times`)
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
