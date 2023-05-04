import * as Buffer from "buffer";
import {RequestDto} from "./validator";

const supportedExtensions: object = {
  '.yaml': 'yml',
  '.yml': 'yml',
  '.json': 'json'
};

const mkdirp = require('mkdirp');
const fs = require('fs');
const isEqual = require('lodash.isequal');
const encoding = 'utf8';
const {Parse} = require('unzipper');
const pathLib = require('path');
const yamlLib = require('js-yaml');
const flat = require('flat');

export function extract_zip_file(root_folder: string, content: Buffer): Promise<any> {
  const path = `${root_folder}/action.zip`;
  fs.writeFileSync(path, content);

  const stream = fs.createReadStream(path).pipe(Parse());

  return new Promise((resolve, reject) => {
    stream.on('entry', (entry) => {
      const writeStream = fs.createWriteStream(`${root_folder}/${entry.path}`);
      return entry.pipe(writeStream);
    });
    stream.on('finish', () => {
      fs.rmSync(path);
      resolve({});
    });
    stream.on('error', (error) => reject(error));
  });
}

export function find_language_code_from_file_path(path: string, all_languages: string[]): string {
  for (const language of all_languages) {
    if (path.includes(`/${language}/`) || path.includes(`/${language}.`)) {
      return language;
    }
  }

  throw Error(`Unable to match ${path} with any of the languages: ${all_languages}`);
}

export const path = require('path');

export async function create_files_from_strings(files_to_strings_map = {}, request_dto: RequestDto): Promise<string[]> {
  const modified_files: string[] = [];

  console.log("FILES TO STRINGS MAP: ", files_to_strings_map);
  files_to_strings_map = await prepare_pull_output(files_to_strings_map, request_dto);

  for (const key in files_to_strings_map) {
    const object = files_to_strings_map[key];
    await mkdirp(object.folder_path);

    const file_type = find_file_type(object.absolute_path);
    console.log("Extension is: " + file_type.extension + ", Absolute path is: " + object.absolute_path);

    if (fs.existsSync(object.absolute_path)) {
      const existing_content = fs.readFileSync(object.absolute_path, encoding);

      let file_content = '';

      if (file_type.extension === 'yml') {
        file_content = yamlLib.load(existing_content);
      } else {
        file_content = JSON.parse(existing_content);
      }

      if (isEqual(file_content, object.strings)) {
        console.log(`File ${object.absolute_path} seems to be in sync`);
        continue;
      }

      if (file_type.extension === 'yml') {
        fs.writeFileSync(object.absolute_path, yamlLib.dump(object.strings), encoding);
      } else {
        fs.writeFileSync(object.absolute_path, JSON.stringify(object.strings, null, 4), encoding);
      }
      console.log(`File ${object.absolute_path} updated successfully`);
      modified_files.push(object.absolute_path);
    } else {
      if (file_type.extension === 'yml') {
        fs.writeFileSync(object.absolute_path, yamlLib.dump(object.strings), encoding);
      } else {
        fs.writeFileSync(object.absolute_path, JSON.stringify(object.strings, null, 4), encoding);
      }
      console.log(`File ${object.absolute_path} created successfully`);
      modified_files.push(object.absolute_path);
    }
  }

  return modified_files;
}

export function find_file_type(file_path: string): object {
  const extension = pathLib.extname(file_path).toLowerCase();
  if (supportedExtensions[extension]) {
    return {extension: supportedExtensions[extension], isSupported: true};
  }

  return {extension: extension, isSupported: false};
}

export async function yaml_to_object(file_path: string) {
  const json = yamlLib.load(fs.readFileSync(file_path, 'utf8'));

  return flat(json);
}

export async function prepare_language_file_prefix(json: string, findKey: string, replaceKey: string) {
  const newJson = {};

  for (const key in json) {
    if (key.startsWith(findKey)) {
      const newKey = key.replace(findKey + '.', replaceKey + '.');
      newJson[newKey] = json[key];
    } else {
      newJson[key] = json[key];
    }
  }

  return newJson;
}

export async function prepare_pull_output(json: string, request_dto: RequestDto) {
  console.log('REQUEST DTO: ', request_dto);
  if (request_dto.file_lang_settings.custom_mapping !== true) {
    return json;
  }

  console.log("JSON BEFORE: ", json);
  console.log("JSON FILE: ", json.file);

  const folder_name = json.folder_path.split("/").pop();
  const extension = json.file.split(".").pop();

  json.file = folder_name + '.' + extension;

  const find_key = json.strings[0].split('.').shift();

  console.log('JSON: ', json);
  console.log('FIND: ', find_key);
  console.log('FOLDER: ', folder_name);

  json.strings = prepare_language_file_prefix(json.strings, find_key, folder_name);

  return json;
}