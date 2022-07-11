# GitHub EasyTranslate Action

GitHub Action that will help you synchronize your translation files from your source code into
our string library.

## Capabilities

* Create your file structure into our string library (currently works for i18n format)
* Pull all the content from our string library (source and target content), matching and keeping your file structure
* Download from our string library, with i18n format

## Usage examples

Please read the [documentation from GitHub](https://docs.github.com/en/actions/using-workflows) about their actions
before diving into the examples.

### Create your file structure on EasyTranslate

Create your file under `.github/workflows/push-to-easytranslate.yml`

```yaml
name: 'Push your strings to EasyTranslate'

on:
  pull_request:
    types: [ labeled ]

jobs:
  download_strings:
    if: ${{ github.event.label.name == 'push-easytranslate-strings' }}
    runs-on: ubuntu-latest
    name: Send strings to EasyTranslate
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          token: ${{ secrets.ACCESS_TOKEN }}
          ref: ${{ github.event.pull_request.head.sha }}

      - name: Execute our action
        uses: ./
        id: push_easytranslate
        with:
          easytranslate_action: 'push'
          source_language: 'en'
          source_root_folder: 'resources'
          translation_file_paths: 'files/**/**json'
          target_languages: 'da,de'
          access_token: ${{ secrets.EASYTRANSLATE_API_ACCESS_TOKEN }}
          base_api_url: 'https://api.platform.sandbox.easytranslate.com'
          team_name: 'x-force-deadpool'
          string_library_id: 'easytranslate-string-library-id'
```

Outcome: When already open PR is labeled with `push-easytranslate-strings` it will trigger the workflow, that will call
our action
to `push` the strings found within the pattern `resources/files/**/**json`, and using the given access token, it will
create sync them with
the given string library.

### Pull your translated content, while keeping your current structure

```yaml
name: 'Pull your strings from EasyTranslate'

on:
  pull_request:
    types: [ labeled ]

jobs:
  pull_strings_from_easytranslate:
    if: ${{ github.event.label.name == 'pull-easytranslate-strings' }}
    runs-on: ubuntu-latest
    name: Download strings from EasyTranslate
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          token: ${{ secrets.ACCESS_TOKEN }}
          ref: ${{ github.event.pull_request.head.sha }}

      - name: Checkout PR
        env:
          GITHUB_TOKEN: ${{ secrets.ACCESS_TOKEN }}
        run: gh pr checkout ${{ github.event.pull_request.number }}

      - name: Execute our action
        uses: ./
        id: pull_easytranslate
        with:
          easytranslate_action: 'pull'
          source_language: 'en'
          source_root_folder: 'resources'
          translation_file_paths: 'files/**/**json'
          target_languages: 'da,de'
          access_token: ${{ secrets.EASYTRANSLATE_API_ACCESS_TOKEN }}
          base_api_url: 'https://api.platform.sandbox.easytranslate.com'
          team_name: 'x-force-deadpool'
          string_library_id: 'easytranslate-string-library-id'

      - name: Update the pull request
        if: ${{ steps.pull_easytranslate.outputs.outcome == 'continue' }}
        env:
          GITHUB_TOKEN: ${{ secrets.ACCESS_TOKEN }}
        run: |
          git config user.name 'Your Name'
          git config user.email 'Your GitHub email'
          git add .
          git commit -am 'Updating strings'
          git push
```

Outcome: When already open PR is labeled with `pull-easytranslate-strings` it will trigger the workflow, that will call
our action
to `pull` all strings from the given library. **Please note this action works only if the strings are created using
the `push` action**

### Download the translated content in i18n format

```yaml
name: 'Download your strings from EasyTranslate'

on:
  pull_request:
    types: [ labeled ]

jobs:
  pull_strings_from_easytranslate:
    if: ${{ github.event.label.name == 'download-easytranslate-strings' }}
    runs-on: ubuntu-latest
    name: Download strings from EasyTranslate
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          token: ${{ secrets.ACCESS_TOKEN }}
          ref: ${{ github.event.pull_request.head.sha }}

      - name: Checkout PR
        env:
          GITHUB_TOKEN: ${{ secrets.ACCESS_TOKEN }}
        run: gh pr checkout ${{ github.event.pull_request.number }}

      - name: Execute our action
        uses: ./
        id: pull_easytranslate
        with:
          easytranslate_action: 'download'
          source_language: 'en'
          source_root_folder: 'resources'
          translation_file_paths: 'files/**/**json'
          target_languages: 'da,de'
          access_token: ${{ secrets.EASYTRANSLATE_API_ACCESS_TOKEN }}
          base_api_url: 'https://api.platform.sandbox.easytranslate.com'
          team_name: 'x-force-deadpool'
          string_library_id: 'easytranslate-string-library-id'
          download_strings_format: 'flat'

      - name: Update the pull request
        if: ${{ steps.pull_easytranslate.outputs.outcome == 'continue' }}
        env:
          GITHUB_TOKEN: ${{ secrets.ACCESS_TOKEN }}
        run: |
          git config user.name 'Your Name'
          git config user.email 'Your GitHub email'
          git add .
          git commit -am 'Updating strings'
          git push
```

Outcome: When already open PR is labeled with `download-easytranslate-strings` it will trigger the workflow, that will
call
our action
to `download` all strings from the given library. The files will be under the `resources` folder, and their file names
will be based on the language code, so in this case there would be 3 files created `en.json`, `de.json` and `da.json`.
Each file will contain the content.

The `download_strings_format` can be `flat` or `nested`.

If the value is `flat` the key names will be as string `{"global.welcome": "Your Value"}`.
If the value is `nested` the key names will be as objects `"{global": {"welcome": "Your Value"}}`.

## More information?

Visit [our website](https://easytranslate.com).



    
