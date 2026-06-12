const fs = require('fs');
const os = require('os');
const pathLib = require('path');

const helpers = require('../src/common/helpers');

describe('find_file_type', () => {
  it('recognizes json files', () => {
    expect(helpers.find_file_type('/some/path/en/app.json')).toEqual({extension: 'json', isSupported: true});
  });

  it('recognizes yml and yaml files', () => {
    expect(helpers.find_file_type('/some/path/en.yml')).toEqual({extension: 'yml', isSupported: true});
    expect(helpers.find_file_type('/some/path/en.yaml')).toEqual({extension: 'yml', isSupported: true});
  });

  it('is case insensitive on the extension', () => {
    expect(helpers.find_file_type('/some/path/en/app.JSON')).toEqual({extension: 'json', isSupported: true});
  });

  it('marks other extensions as not supported', () => {
    expect(helpers.find_file_type('/some/path/de.ts')).toEqual({extension: '.ts', isSupported: false});
  });
});

describe('find_language_code_from_file_path', () => {
  const languages = ['en', 'da', 'de'];

  it('matches the language from a folder in the path', () => {
    expect(helpers.find_language_code_from_file_path('/root/files/en/app.json', languages)).toBe('en');
  });

  it('matches the language from the file name', () => {
    expect(helpers.find_language_code_from_file_path('/root/locale/da.json', languages)).toBe('da');
  });

  it('throws when no language matches', () => {
    expect(() => helpers.find_language_code_from_file_path('/root/files/fr/app.json', languages))
      .toThrow('Unable to match /root/files/fr/app.json with any of the languages: en,da,de');
  });
});

describe('create_files_from_strings (json pull flow)', () => {
  let tmp_dir: string;

  beforeEach(() => {
    tmp_dir = fs.mkdtempSync(pathLib.join(os.tmpdir(), 'et-action-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmp_dir, {recursive: true, force: true});
  });

  const file_map = (folder: string, file: string, strings: object) => ({
    [`files/${pathLib.basename(folder)}/${file}`]: {
      absolute_path: `${folder}/${file}`,
      folder_path: folder,
      file: file,
      strings: strings
    }
  });

  it('creates a missing json file with its folder and 4-space indentation', async () => {
    const folder = pathLib.join(tmp_dir, 'da');
    const strings = {'app.title': 'Velkommen', 'app.cta': 'Køb nu'};

    const modified = await helpers.create_files_from_strings(file_map(folder, 'app.json', strings));

    expect(modified).toEqual([`${folder}/app.json`]);
    const written = fs.readFileSync(`${folder}/app.json`, 'utf8');
    expect(JSON.parse(written)).toEqual(strings);
    expect(written).toBe(JSON.stringify(strings, null, 4));
  });

  it('overwrites a json file whose content is outdated', async () => {
    const folder = pathLib.join(tmp_dir, 'da');
    fs.mkdirSync(folder, {recursive: true});
    fs.writeFileSync(`${folder}/app.json`, JSON.stringify({'app.title': 'Gammel tekst'}), 'utf8');
    const strings = {'app.title': 'Velkommen'};

    const modified = await helpers.create_files_from_strings(file_map(folder, 'app.json', strings));

    expect(modified).toEqual([`${folder}/app.json`]);
    expect(JSON.parse(fs.readFileSync(`${folder}/app.json`, 'utf8'))).toEqual(strings);
  });

  it('skips a json file that is already in sync', async () => {
    const folder = pathLib.join(tmp_dir, 'da');
    const strings = {'app.title': 'Velkommen'};
    fs.mkdirSync(folder, {recursive: true});
    fs.writeFileSync(`${folder}/app.json`, JSON.stringify(strings, null, 4), 'utf8');

    const modified = await helpers.create_files_from_strings(file_map(folder, 'app.json', strings));

    expect(modified).toEqual([]);
  });
});

describe('yaml_to_object', () => {
  it('flattens nested yaml into dot notation keys', async () => {
    const tmp_dir = fs.mkdtempSync(pathLib.join(os.tmpdir(), 'et-action-test-'));
    fs.writeFileSync(`${tmp_dir}/en.yml`, 'app:\n  title: "Welcome"\n  cta: "Buy now"\n', 'utf8');

    const flattened = await helpers.yaml_to_object(`${tmp_dir}/en.yml`);

    expect(flattened).toEqual({'app.title': 'Welcome', 'app.cta': 'Buy now'});
    fs.rmSync(tmp_dir, {recursive: true, force: true});
  });
});
