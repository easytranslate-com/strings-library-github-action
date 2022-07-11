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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = require('@actions/core');
const glob = require('@actions/glob');
const helpers = require('./common/helpers');
const validation = require('./common/validator');
function push(strings_api, request_dto) {
    var e_1, _a;
    return __awaiter(this, void 0, void 0, function* () {
        let files = [];
        const globberOptions = { followSymbolicLinks: request_dto.follow_symlinks };
        for (const pattern of request_dto.translation_paths) {
            const globber = yield glob.create(`${request_dto.source_root_folder}/${pattern}`, globberOptions);
            try {
                for (var _b = (e_1 = void 0, __asyncValues(globber.globGenerator())), _c; _c = yield _b.next(), !_c.done;) {
                    const file_path = _c.value;
                    const language_code = helpers.find_language_code_from_file_path(file_path, request_dto.all_languages);
                    const relative_path = file_path.split(request_dto.source_root_folder)[1];
                    files.push({
                        language_code: language_code,
                        absolute_path: file_path,
                        relative_path: relative_path,
                        source_root_path: `/${request_dto.source_root_folder}${relative_path}`
                    });
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        if (files.length === 0) {
            throw Error('No files matched the given pattern');
        }
        yield strings_api.syncToLibrary(files, request_dto.source_language, request_dto.target_languages);
        core.info("Strings are synced with EasyTranslate");
    });
}
function pull(strings_api, request_dto) {
    return __awaiter(this, void 0, void 0, function* () {
        const keys = yield strings_api.autoPaginatedTranslations(request_dto.target_languages);
        const files_to_content_map = {};
        while (true) {
            const generator = yield keys.next();
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
        const modified_files = yield helpers.create_files_from_strings(files_to_content_map);
        if (modified_files.length === 0) {
            core.setOutput('outcome', 'skip');
            console.log('Executed without any changes');
            return;
        }
        console.log(`Modified files: ${modified_files}`);
        core.setOutput('outcome', 'continue');
    });
}
function download(strings_api, request_dto) {
    return __awaiter(this, void 0, void 0, function* () {
        const content = yield strings_api.download(request_dto);
        yield helpers.extract_zip_file(request_dto.source_root_folder, content);
        core.setOutput('outcome', 'continue');
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const request_dto = validation.validateRequest();
            const easytranslate_api = require('./easytranslate/api');
            if (request_dto.action === 'push') {
                yield push(easytranslate_api.strings(), request_dto);
            }
            else if (request_dto.action === 'pull') {
                yield pull(easytranslate_api.strings(), request_dto);
            }
            else if (request_dto.action === 'download') {
                yield download(easytranslate_api.strings(), request_dto);
            }
            else {
                throw Error('Invalid action found');
            }
        }
        catch (error) {
            console.log(error);
            core.setFailed(error.message);
        }
    });
}
run();
