## finetune

a GitHub action for GPT fine tuning.

## Usage

```
    steps:
      - uses: actions/checkout@v2
      - name: fine tune
        id: finetune
        uses: metrue/finetune@v1
        with:
          dataset: './dataset.json'
          openai-api-key: ${{ secrets.OPEN_AI_KEY }}
          openai-api-org: ${{ secrets.OPEN_AI_ORG }}
          wait-job-completed: true
      - name: use the model
        run: echo "The model is ${{ steps.finetune.outputs.model }} ${{ steps.finetune.outputs.status }}"
```

## License

MIT
