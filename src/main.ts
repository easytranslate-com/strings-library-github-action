import {RequestDto} from './common/validator';
import {StringLibrary} from "./easytranslate/string-library";

const core = require('@actions/core');
const glob = require('@actions/glob');
const helpers = require('./common/helpers');
const validation = require('./common/validator');

async function push(strings_api: StringLibrary, request_dto: RequestDto) {
  let files: object[] = [];
  const globberOptions = {followSymbolicLinks: request_dto.follow_symlinks};
  for (const pattern of request_dto.translation_paths) {
    const globber = await glob.create(`${request_dto.source_root_folder}/${pattern}`, globberOptions);
    for await (const file_path of globber.globGenerator()) {
      const language_code = helpers.find_language_code_from_file_path(file_path, request_dto.all_languages)
      const relative_path = file_path.split(request_dto.source_root_folder)[1];
      files.push({
        language_code: language_code,
        absolute_path: file_path,
        relative_path: relative_path,
        source_root_path: `/${request_dto.source_root_folder}${relative_path}`
      });
    }
  }

  if (files.length === 0) {
    throw Error('No files matched the given pattern');
  }

  await strings_api.syncToLibrary(files, request_dto.source_language, request_dto.target_languages);
  core.info("Strings are synced with EasyTranslate");
}

async function pull(strings_api: StringLibrary, request_dto: RequestDto) {
  const keys = await strings_api.autoPaginatedTranslations(request_dto.target_languages);
  const files_to_content_map = {};
  while (true) {
    const generator = await keys.next();
    if (generator.done === true) {
      break;
    }
    const translation_key = generator.value;
    for (const translation of translation_key.attributes.translations) {
      let [file_name, key_name] = translation.key.split('::');
      file_name = file_name.replace(`/${request_dto.source_language}/`, `/${translation.language_code}/`);
      if (!files_to_content_map.hasOwnProperty(file_name)) {
        const path_details = helpers.path.parse(file_name);
        files_to_content_map[file_name] = {
          absolute_path: `${request_dto.source_root_folder}/${file_name}`,
          folder_path: `${request_dto.source_root_folder}/${path_details.dir}`,
          file: path_details.base,
          strings: {}
        };
      }

      files_to_content_map[file_name].strings[key_name] = translation.text;
    }
  }

  const modified_files = await helpers.create_files_from_strings(files_to_content_map);
  if (modified_files.length === 0) {
    core.setOutput('outcome', 'skip');
    console.log('Executed without any changes');
    return;
  }

  console.log(`Modified files: ${modified_files}`);
  core.setOutput('outcome', 'continue');
}

async function download(strings_api: StringLibrary, request_dto: RequestDto) {
  const content = await strings_api.download(request_dto);
  await helpers.extract_zip_file(request_dto.source_root_folder, content);
  core.setOutput('outcome', 'continue');
}


async function run() {
  try {
    const request_dto = validation.validateRequest();
    const easytranslate_api = require('./easytranslate/api');

    if (request_dto.action === 'push') {
      await push(easytranslate_api.strings(), request_dto);
    } else if (request_dto.action === 'pull') {
      await pull(easytranslate_api.strings(), request_dto);
    } else if (request_dto.action === 'download') {
      await download(easytranslate_api.strings(), request_dto);
    } else {
      throw Error('Invalid action found');
    }
  } catch (error: any) {
    console.log(error);
    core.setFailed(error.message);
  }
}

run();