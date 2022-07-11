import {StringLibrary} from "./string-library";

const validator = require('./../common/validator');
require('./string-library');

const dto = validator.validateApiConstructor()

export const strings = () => {
  return new StringLibrary(dto);
}