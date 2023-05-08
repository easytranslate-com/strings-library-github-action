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
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringLibrary = void 0;
const axios_1 = __importDefault(require("axios"));
const helpers = require('./../common/helpers');
const GATEWAY_PREFIX = 'strings-library';
class StringLibrary {
    constructor(dto) {
        this.base_url = `${dto.base_url}/${GATEWAY_PREFIX}/api/v1/teams/${dto.team_name}`;
        this.library_id = dto.string_library_id;
        this.http = axios_1.default.create({
            baseURL: this.base_url,
            headers: {
                authorization: `Bearer ${dto.access_token}`,
                accept: 'application/json',
                'content-type': 'application/json'
            }
        });
    }
    syncToLibrary(files, request_dto) {
        return __awaiter(this, void 0, void 0, function* () {
            const keys = {};
            let content = {};
            let source_language = request_dto.source_language;
            let target_languages = request_dto.target_languages;
            let file_lang_settings = request_dto.file_lang_settings;
            for (const file of files) {
                if (file.file_type.extension === 'json') {
                    content = yield require(file.absolute_path);
                }
                else {
                    content = yield helpers.yaml_to_object(file.absolute_path);
                    if (file_lang_settings.custom_mapping == true) {
                        const langObject = file_lang_settings.files[file.language_code] || null;
                        if (langObject !== null) {
                            const langValue = langObject.language_code;
                            content = yield helpers.prepare_language_file_prefix(content, langObject.root_content, langValue);
                        }
                    }
                }
                const keyPrefix = StringLibrary.createKeyFromFile(file.relative_path, source_language, file.language_code);
                for (const fileKey in content) {
                    const key = `${keyPrefix}::${fileKey}`;
                    const value = content[fileKey];
                    if (!keys[key]) {
                        keys[key] = { strings: {} };
                    }
                    keys[key].name = key;
                    keys[key].external_id = key;
                    keys[key].strings[file.language_code] = {
                        text: value,
                        language_code: file.language_code,
                        external_id: key
                    };
                }
            }
            if (Object.keys(keys).length !== 0) {
                yield this.post(`libraries/${this.library_id}/sync`, {
                    type: 'libraries',
                    attributes: { source_language, target_languages, keys }
                });
            }
        });
    }
    autoPaginatedTranslations(target_languages) {
        return __asyncGenerator(this, arguments, function* autoPaginatedTranslations_1() {
            let page = 1;
            let data = yield __await(this.getTranslations(target_languages, page));
            while (true) {
                for (const translation of data) {
                    yield yield __await(translation);
                }
                if (data.length === 0) {
                    break;
                }
                page += 1;
                data = yield __await(this.getTranslations(target_languages, page));
            }
        });
    }
    getTranslations(target_languages, page = 1, per_page = 50) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = `page=${page}&perPage=${per_page}`;
            for (const index in target_languages) {
                query += `&filters[target_languages][${index}]=${target_languages[index]}`;
            }
            const response = yield this.get(`libraries/${this.library_id}/bilingual?${query}`);
            return response.data;
        });
    }
    download(request_dto) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.post(`libraries/${this.library_id}/download`, {
                type: 'library-download',
                attributes: {
                    languages: request_dto.all_languages,
                    options: {
                        exclude_empty_translations: true,
                        unpack_strings: request_dto.download_strings_format === 'nested'
                    }
                }
            }, { responseType: "arraybuffer" });
            return response.data;
        });
    }
    static createKeyFromFile(file, source_language, language_code) {
        file = file
            .replace(`/${language_code}/`, `/${source_language}/`)
            .replace(`/${language_code}.`, `/${source_language}.`);
        if (file[0] === '/') {
            file = file.slice(1);
        }
        return file;
    }
    post(path, payload, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.http.post(`${path}`, { data: payload }, options);
            }
            catch (error) {
                if (error.statusCode < 500) {
                    throw Error(error.data.message);
                }
                throw error;
            }
        });
    }
    get(path) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.http.get(path);
                return response.data;
            }
            catch (error) {
                if (error.statusCode < 500) {
                    throw Error(error.data.message);
                }
                throw error;
            }
        });
    }
}
exports.StringLibrary = StringLibrary;
