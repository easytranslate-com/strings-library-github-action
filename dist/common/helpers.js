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
exports.prepare_language_file_prefix = exports.yaml_to_object = exports.find_file_type = exports.create_files_from_strings = exports.path = exports.find_language_code_from_file_path = exports.extract_zip_file = void 0;
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
    for (const language of all_languages) {
        if (path.includes(`/${language}/`) || path.includes(`/${language}.`)) {
            return language;
        }
    }
    throw Error(`Unable to match ${path} with any of the languages: ${all_languages}`);
}
exports.find_language_code_from_file_path = find_language_code_from_file_path;
exports.path = require('path');
function create_files_from_strings(files_to_strings_map = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        const modified_files = [];
        for (const key in files_to_strings_map) {
            const object = files_to_strings_map[key];
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
function prepare_language_file_prefix(jsonStr, findKey, replaceString) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("JSON STR DEBUG: ", jsonStr);
        let jsonObj = JSON.parse(jsonStr);
        console.log("JSON STR DEBUG (AFTER): ", jsonObj);
        jsonObj[replaceString] = jsonObj[findKey];
        delete jsonObj[findKey];
        return JSON.stringify(jsonObj);
    });
}
exports.prepare_language_file_prefix = prepare_language_file_prefix;
