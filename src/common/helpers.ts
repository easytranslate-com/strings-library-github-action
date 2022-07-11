import * as Buffer from "buffer";

const mkdirp = require('mkdirp');
const fs = require('fs');
const isEqual = require('lodash.isequal');
const encoding = 'utf8';
const {Parse} = require('unzipper');

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
    if (path.includes(`/${language}/`)) {
      return language;
    }
  }

  throw Error(`Unable to match ${path} with any of the languages: ${all_languages}`);
}

export const path = require('path');

export async function create_files_from_strings(files_to_strings_map = {}): Promise<string[]> {
  const modified_files: string[] = [];

  for (const key in files_to_strings_map) {
    const object = files_to_strings_map[key];
    await mkdirp(object.folder_path);

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
    } else {
      fs.writeFileSync(object.absolute_path, JSON.stringify(object.strings, null, 4), encoding);
      console.log(`File ${object.absolute_path} created successfully`);
      modified_files.push(object.absolute_path);
    }
  }

  return modified_files;
}