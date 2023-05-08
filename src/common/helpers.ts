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
  console.log("ALL LANGUAGES: ", all_languages);
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

  console.log('FILES TO STRINGS MAP: ', files_to_strings_map);
  console.log('REQUEST DTO: ', request_dto);

  files_to_strings_map = await prepare_pull_output_for_files(files_to_strings_map, request_dto);

  console.log('FILES TO STRINGS MAP (PREPARED): ', files_to_strings_map);

  for (const key in files_to_strings_map) {
    const object = files_to_strings_map[key];

    console.log('OBJECT: ', object);
    
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

export async function prepare_pull_output_for_files(json: string, request_dto: RequestDto) {
  if (request_dto.file_lang_settings.custom_mapping !== true) {
    return json;
  }

  for (const key in json) {
    // const find_key = Object.keys(json[key].strings)[0].split('.').shift();
    const find_key = json[key].split('.').shift();
    const replace_key = request_dto.file_lang_settings.files.find(obj => find_key in obj);
    const replace_value = replace_key[find_key];

    console.log("FIND KEY: ", find_key);
    console.log("REPLACE KEY: ", replace_key);
    console.log("REPLACE VALUE: ", replace_value);

    if (replace_key !== undefined) {
      json[key].strings = await prepare_language_file_prefix(json[key].strings, find_key, replace_value);
    }

    json[key].strings = unflattenData(json[key].strings);
  }

  return json;
}

export async function prepare_pull_output(json: string, request_dto: RequestDto) {
  if (request_dto.file_lang_settings.custom_mapping !== true) {
    return json;
  }

  for (const key in json) {
    const folder_name = json[key].folder_path.split("/").pop();
    const extension = json[key].file.split(".").pop();

    json[key].file = folder_name + '.' + extension;
    json[key].absolute_path = json[key].folder_path + '/' + json[key].file;

    const find_key = Object.keys(json[key].strings)[0].split('.').shift();

    json[key].strings = await prepare_language_file_prefix(json[key].strings, find_key, folder_name);
  }

  return json;
}

function unflattenData(flatData: { [key: string]: any }): { [key: string]: any } {
  const result: { [key: string]: any } = {};

  for (const key in flatData) {
    if (flatData.hasOwnProperty(key)) {
      const value = flatData[key];
      const keys = key.split('.');

      let currentObject = result;
      for (let i = 0; i < keys.length - 1; i++) {
        const currentKey = keys[i];
        if (!currentObject.hasOwnProperty(currentKey)) {
          currentObject[currentKey] = {};
        }
        currentObject = currentObject[currentKey];
      }

      const lastKey = keys[keys.length - 1];
      currentObject[lastKey] = value;
    }
  }

  return result;
}
