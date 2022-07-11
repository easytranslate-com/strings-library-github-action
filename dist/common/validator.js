"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = exports.validateApiConstructor = void 0;
const core = require('@actions/core');
core.setSecret('access_token');
const validate_action = () => {
    const action = validate_not_empty(core.getInput('easytranslate_action'), 'easytranslate_action');
    if (['pull', 'push', 'download'].includes(action) === false) {
        throw Error(`Invalid value ${action} given for easytranslate_action`);
    }
    return action;
};
const validate_source_root = () => {
    return validate_not_empty(core.getInput('source_root_folder'), 'source_root_folder');
};
const validate_source_language = () => {
    return validate_not_empty(core.getInput('source_language'), 'source_language');
};
const validate_target_languages = () => {
    return validate_not_empty(core.getInput('target_languages'), 'target_languages').split(',');
};
const validate_translation_paths = () => {
    return validate_not_empty(core.getInput('translation_file_paths'), 'translation_file_paths').split(',');
};
const validate_download_strings_format = (action) => {
    if (action !== 'download') {
        return '';
    }
    const value = validate_not_empty(core.getInput('download_strings_format'), 'download_strings_format');
    if (!['flat', 'nested'].includes(value)) {
        throw Error(`Invalid value ${value} given for download_strings_format`);
    }
    return value;
};
const validateApiConstructor = () => {
    const access_token = validate_not_empty(core.getInput('access_token'), 'access_token');
    const base_url = validate_not_empty(core.getInput('base_api_url'), 'base_api_url');
    const team_name = validate_not_empty(core.getInput('team_name'), 'team_name');
    const string_library_id = validate_not_empty(core.getInput('string_library_id'), 'string_library_id');
    return {
        access_token,
        base_url: base_url,
        team_name: team_name,
        string_library_id: string_library_id
    };
};
exports.validateApiConstructor = validateApiConstructor;
const validate_not_empty = (input, key) => {
    if (input.length === 0) {
        throw Error(`${key} is required`);
    }
    return input;
};
const validateRequest = () => {
    const source_language = validate_source_language();
    const target_languages = validate_target_languages();
    const action = validate_action();
    return {
        action,
        source_root_folder: validate_source_root(),
        source_language,
        target_languages,
        translation_paths: validate_translation_paths(),
        all_languages: target_languages.concat(source_language),
        follow_symlinks: true,
        download_strings_format: validate_download_strings_format(action)
    };
};
exports.validateRequest = validateRequest;
