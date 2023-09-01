const OpenAI = require('openai')
//const fs = require('fs')
const core = require('@actions/core')
//const github = require('@actions/github')

const main = async () => {
  // `who-to-greet` input defined in action metadata file
  const dataset = core.getInput('dataset')
  const OPENAI_API_KEY = core.getInput('openai-api-key')
  // eslint-disable-next-line
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
    organization: 'org-vxJuwLmNT507SqU8QoPJfiYz',
  })

  let res = await openai.files.list()

  for (const f of res.data) {
    const { status, id, purpose } = f
    // eslint-disable-next-line
    console.log(`${id} ${purpose} ${status}`)
  }
  //const fd = fs.createReadStream('./src/dataset.json', 'utf8')
  // eslint-disable-next-line
  console.log(`dataset: ${dataset}`)

  core.setOutput('afakemodel')

  /*
  res = await openai.files.create(
    {
      file: fd,
      purpose: 'fine-tune',
    },
    {
      stream: true,
    },
  )
*/
}

main()
  .then((data) => {
    // eslint-disable-next-line
    console.log(data)
  })
  .catch((e) => {
    core.setFailed(e.message)
  })
