"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strings = void 0;
const string_library_1 = require("./string-library");
const validator = require('./../common/validator');
require('./string-library');
const dto = validator.validateApiConstructor();
const strings = () => {
    return new string_library_1.StringLibrary(dto);
};
exports.strings = strings;
