"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepare_pull_output = exports.prepare_pull_output_for_files = exports.prepare_language_file_prefix = exports.yaml_to_object = exports.find_file_type = exports.create_files_from_strings = exports.path = exports.find_language_code_from_file_path = exports.extract_zip_file = void 0;
const supportedExtensions = {
    '.yaml': 'yml',
    '.yml': 'yml',
    '.json': 'json'
};
const mkdirp = require('mkdirp');
const fs = require('fs');
const isEqual = require('lodash.isequal');
const encoding = 'utf8';
const { Parse } = require('unzipper');
const pathLib = require('path');
const yamlLib = require('js-yaml');
const flat = require('flat');
function extract_zip_file(root_folder, content) {
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
exports.extract_zip_file = extract_zip_file;
function find_language_code_from_file_path(path, all_languages) {
    console.log("ALL LANGUAGES: ", all_languages);
    for (const language of all_languages) {
        if (path.includes(`/${language}/`) || path.includes(`/${language}.`)) {
            return language;
        }
    }
    throw Error(`Unable to match ${path} with any of the languages: ${all_languages}`);
}
exports.find_language_code_from_file_path = find_language_code_from_file_path;
exports.path = require('path');
function create_files_from_strings(files_to_strings_map = {}, request_dto) {
    return __awaiter(this, void 0, void 0, function* () {
        const modified_files = [];
        console.log('FILES TO STRINGS MAP: ', files_to_strings_map);
        console.log('REQUEST DTO: ', request_dto);
        files_to_strings_map = yield prepare_pull_output_for_files(files_to_strings_map, request_dto);
        console.log('FILES TO STRINGS MAP (PREPARED): ', files_to_strings_map);
        for (const key in files_to_strings_map) {
            const object = files_to_strings_map[key];
            console.log('OBJECT: ', object);
            yield mkdirp(object.folder_path);
            const file_type = find_file_type(object.absolute_path);
            console.log("Extension is: " + file_type.extension + ", Absolute path is: " + object.absolute_path);
            if (fs.existsSync(object.absolute_path)) {
                const existing_content = fs.readFileSync(object.absolute_path, encoding);
                let file_content = '';
                if (file_type.extension === 'yml') {
                    file_content = yamlLib.load(existing_content);
                }
                else {
                    file_content = JSON.parse(existing_content);
                }
                if (isEqual(file_content, object.strings)) {
                    console.log(`File ${object.absolute_path} seems to be in sync`);
                    continue;
                }
                if (file_type.extension === 'yml') {
                    fs.writeFileSync(object.absolute_path, yamlLib.dump(object.strings), encoding);
                }
                else {
                    fs.writeFileSync(object.absolute_path, JSON.stringify(object.strings, null, 4), encoding);
                }
                console.log(`File ${object.absolute_path} updated successfully`);
                modified_files.push(object.absolute_path);
            }
            else {
                if (file_type.extension === 'yml') {
                    fs.writeFileSync(object.absolute_path, yamlLib.dump(object.strings), encoding);
                }
                else {
                    fs.writeFileSync(object.absolute_path, JSON.stringify(object.strings, null, 4), encoding);
                }
                console.log(`File ${object.absolute_path} created successfully`);
                modified_files.push(object.absolute_path);
            }
        }
        return modified_files;
    });
}
exports.create_files_from_strings = create_files_from_strings;
function find_file_type(file_path) {
    const extension = pathLib.extname(file_path).toLowerCase();
    if (supportedExtensions[extension]) {
        return { extension: supportedExtensions[extension], isSupported: true };
    }
    return { extension: extension, isSupported: false };
}
exports.find_file_type = find_file_type;
function yaml_to_object(file_path) {
    return __awaiter(this, void 0, void 0, function* () {
        const json = yamlLib.load(fs.readFileSync(file_path, 'utf8'));
        return flat(json);
    });
}
exports.yaml_to_object = yaml_to_object;
function prepare_language_file_prefix(json, findKey, replaceKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const newJson = {};
        for (const key in json) {
            if (key.startsWith(findKey)) {
                const newKey = key.replace(findKey + '.', replaceKey + '.');
                newJson[newKey] = json[key];
            }
            else {
                newJson[key] = json[key];
            }
        }
        return newJson;
    });
}
exports.prepare_language_file_prefix = prepare_language_file_prefix;
function prepare_pull_output_for_files(json, request_dto) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('JSON: ', json);
        if (request_dto.file_lang_settings.custom_mapping !== true) {
            return json;
        }
        // const langObject = file_lang_settings.files[file.language_code] || null;
        //
        // console.log('LANG OBJECT:', langObject);
        //
        // if (langObject !== null) {
        //
        //   const langValue = langObject.language_code;
        //   console.log('TEST CONTENT:', langValue);
        //   content = await helpers.prepare_language_file_prefix(content, langObject.root_content, langValue);
        // }
        for (const key in json) {
            const find_key = Object.keys(json[key].strings)[0].split('.').shift();
            // const find_key = json[key].split('.').shift();
            const prefix_config = request_dto.file_lang_settings.files[json[key].language_code] || null;
            // const replace_value = replace_key[find_key];
            // const replace_value = json[key].file.split('.').shift();
            // json[key].language_code
            console.log("FIND KEY: ", find_key);
            // console.log("REPLACE KEY: ", replace_key);
            // console.log("REPLACE VALUE: ", replace_value);
            if (prefix_config !== null) {
                // file_lang_settings: '{"custom_mapping": true, "files": {"en": {"root_content": "en", "language_code": "en"}, "nl_NL": {"root_content": "en", "language_code": "nl"}}}'
                json[key].strings = yield prepare_language_file_prefix(json[key].strings, prefix_config.root_content, prefix_config.language_code);
            }
            json[key].strings = unflattenData(json[key].strings);
        }
        return json;
    });
}
exports.prepare_pull_output_for_files = prepare_pull_output_for_files;
function prepare_pull_output(json, request_dto) {
    return __awaiter(this, void 0, void 0, function* () {
        if (request_dto.file_lang_settings.custom_mapping !== true) {
            return json;
        }
        for (const key in json) {
            const folder_name = json[key].folder_path.split("/").pop();
            const extension = json[key].file.split(".").pop();
            json[key].file = folder_name + '.' + extension;
            json[key].absolute_path = json[key].folder_path + '/' + json[key].file;
            const find_key = Object.keys(json[key].strings)[0].split('.').shift();
            json[key].strings = yield prepare_language_file_prefix(json[key].strings, find_key, folder_name);
        }
        return json;
    });
}
exports.prepare_pull_output = prepare_pull_output;
function unflattenData(flatData) {
    const result = {};
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
