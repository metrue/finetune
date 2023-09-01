const OpenAI = require('openai')
const core = require('@actions/core')

const main = async () => {
  // `who-to-greet` input defined in action metadata file
  const OPENAI_API_KEY = core.getInput('openai-api-key')
  const OPENAI_API_ORG = core.getInput('openai-api-org')
  const fileId = core.getInput('file-id')
  // eslint-disable-next-line
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
    organization: OPENAI_API_ORG,
  })

  const res = await openai.files.list()
  for (const f of res.data) {
    const { status, id } = f
    // eslint-disable-next-line
    // console.log(`${id} ${purpose} ${status}`)
    if (id === fileId) {
      core.setOutput('status', status)
    }
  }
}

main().catch((e) => {
  core.setFailed(e.message)
})
