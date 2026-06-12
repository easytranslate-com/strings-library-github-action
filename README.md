# GitHub EasyTranslate Action

GitHub Action that synchronizes the translation files in your repository with an
[EasyTranslate](https://easytranslate.com) String Library — push your source strings for
translation and bring the translated files back, keeping your original file structure.

## Capabilities

* **Push** your source strings (JSON and YAML) into a String Library, mirroring your file structure
* **Pull** translated content back, recreating one file per language with your original structure
* **Download** the whole library as i18n files (one file per language, flat or nested keys)
* Custom language mapping for YAML files that wrap their keys under a language-specific root

## How it works

Every string is stored in the library under a key that encodes the file it came from, e.g.
`files/en/app.json::checkout.title`. That is what allows `pull` to recreate your files per
language. A few conventions follow from this:

* **The language of a file is detected from its path** — either a language folder
  (`files/en/app.json`) or the file name itself (`locale/en.json`). Every matched file must
  contain one of your configured language codes in its path.
* **JSON files must use flat keys** (`{"checkout.title": "…"}`). Nested JSON objects are not
  supported for `push`. YAML files can be nested — they are flattened automatically.
* **`push` and `pull` work as a pair.** `pull` can only reconstruct files for strings that were
  created via `push`. If you maintain your strings directly in the String Library, use
  `download` instead.

## Inputs

| Input | Required | Description |
|---|---|---|
| `easytranslate_action` | yes | `push`, `pull` or `download` |
| `source_language` | yes | Source language code, e.g. `en` |
| `target_languages` | yes | Comma-separated target language codes, e.g. `da,de` |
| `source_root_folder` | yes | Root folder of your strings; do not repeat it in `translation_file_paths` |
| `translation_file_paths` | yes | Glob pattern(s) relative to the root folder, e.g. `files/**/**json` |
| `access_token` | yes | Your EasyTranslate API token (store it as a repository secret) |
| `base_api_url` | yes | `https://api.platform.easytranslate.com` (or your sandbox URL) |
| `team_name` | yes | Your EasyTranslate team identifier |
| `string_library_id` | yes | The String Library that stores your translations |
| `download_strings_format` | `download` only | `flat` or `nested` JSON keys in the downloaded files |
| `file_lang_settings` | no | JSON string enabling custom language mapping for YAML files (see below). Defaults to `{"custom_mapping": false}` |

**Output:** `outcome` — `continue` when `pull`/`download` changed any files, `skip` when
everything was already in sync. Use it to decide whether to commit the changes.

## Usage examples

Please read the [GitHub Actions documentation](https://docs.github.com/en/actions/using-workflows)
before diving into the examples. All examples are label-triggered: adding the label to an open
pull request starts the workflow. The complete files live in the
[`examples/`](examples/.github/workflows) folder.

### Push your strings to EasyTranslate

Create `.github/workflows/push-to-easytranslate.yml`:

```yaml
name: 'Push your strings to EasyTranslate'

on:
  pull_request:
    types: [ labeled ]

jobs:
  push_strings_to_easytranslate:
    if: ${{ github.event.label.name == 'push-easytranslate-strings' }}
    runs-on: ubuntu-latest
    name: Send strings to EasyTranslate
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.ACCESS_TOKEN }}
          ref: ${{ github.event.pull_request.head.sha }}

      - name: Execute our action
        uses: "easytranslate-com/strings-library-github-action@v2"
        id: push_easytranslate
        with:
          easytranslate_action: 'push'
          source_language: 'en'
          source_root_folder: 'resources'
          translation_file_paths: 'files/**/**json'
          target_languages: 'da,de'
          access_token: ${{ secrets.EASYTRANSLATE_API_ACCESS_TOKEN }}
          base_api_url: 'https://api.platform.easytranslate.com'
          team_name: 'your-team-name'
          string_library_id: 'your-string-library-id'
```

Labeling an open PR with `push-easytranslate-strings` sends every string matching
`resources/files/**/**json` to the given String Library.

### Pull your translated content back

```yaml
name: 'Pull your strings from EasyTranslate'

on:
  pull_request:
    types: [ labeled ]

jobs:
  pull_strings_from_easytranslate:
    if: ${{ github.event.label.name == 'pull-easytranslate-strings' }}
    runs-on: ubuntu-latest
    name: Pull strings from EasyTranslate
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.ACCESS_TOKEN }}
          ref: ${{ github.event.pull_request.head.sha }}

      - name: Checkout PR
        env:
          GITHUB_TOKEN: ${{ secrets.ACCESS_TOKEN }}
        run: gh pr checkout ${{ github.event.pull_request.number }}

      - name: Execute our action
        uses: "easytranslate-com/strings-library-github-action@v2"
        id: pull_easytranslate
        with:
          easytranslate_action: 'pull'
          source_language: 'en'
          source_root_folder: 'resources'
          translation_file_paths: 'files/**/**json'
          target_languages: 'da,de'
          access_token: ${{ secrets.EASYTRANSLATE_API_ACCESS_TOKEN }}
          base_api_url: 'https://api.platform.easytranslate.com'
          team_name: 'your-team-name'
          string_library_id: 'your-string-library-id'

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

Labeling the PR with `pull-easytranslate-strings` fetches the translations and commits the
translated files back to the PR — e.g. `resources/files/da/app.json` next to your
`resources/files/en/app.json`. **This only works for strings created with the `push` action.**

### Download the library in i18n format

Same shape as `pull`, with two differences in the action step:

```yaml
          easytranslate_action: 'download'
          download_strings_format: 'flat'
```

Labeling the PR with your download label fetches every language as one file under
`source_root_folder` (`en.json`, `da.json`, `de.json`, …). With `flat`, keys stay as strings
(`{"global.welcome": "Your value"}`); with `nested`, dot-separated keys become nested objects
(`{"global": {"welcome": "Your value"}}`).

## Custom language mapping (YAML)

Some YAML setups wrap all keys under a language-specific root key (for example Rails-style
`nl_NL:` at the top of the file). The `file_lang_settings` input rewrites that prefix on `push`
so all languages share the same keys, and restores it on `pull`:

```yaml
          file_lang_settings: '{"custom_mapping": true, "files": {"nl_NL": {"language_code": "nl", "root_content": "nl_NL"}}}'
```

If you do not use this, omit the input entirely.

## Versioning

Use `@v2` to follow the current stable line (no breaking changes within it), or pin a specific
release tag (e.g. `@v2.0.4`) if you prefer fully reproducible workflows.

## More information

Visit [our website](https://easytranslate.com).
