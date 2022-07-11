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
exports.create_files_from_strings = exports.path = exports.find_language_code_from_file_path = exports.extract_zip_file = void 0;
const mkdirp = require('mkdirp');
const fs = require('fs');
const isEqual = require('lodash.isequal');
const encoding = 'utf8';
const { Parse } = require('unzipper');
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
        if (path.includes(`/${language}/`)) {
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
            if (fs.existsSync(object.absolute_path)) {
                const existing_content = fs.readFileSync(object.absolute_path, encoding);
                const file_content = JSON.parse(existing_content);
                if (isEqual(file_content, object.strings)) {
                    console.log(`File ${object.absolute_path} seems to be in sync`);
                    continue;
                }
                fs.writeFileSync(object.absolute_path, JSON.stringify(object.strings, null, 4), encoding);
                console.log(`File ${object.absolute_path} updated successfully`);
                modified_files.push(object.absolute_path);
            }
            else {
                fs.writeFileSync(object.absolute_path, JSON.stringify(object.strings, null, 4), encoding);
                console.log(`File ${object.absolute_path} created successfully`);
                modified_files.push(object.absolute_path);
            }
        }
        return modified_files;
    });
}
exports.create_files_from_strings = create_files_from_strings;
