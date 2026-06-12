import axios from 'axios';
import {StringLibrary} from '../src/easytranslate/string-library';

jest.mock('axios');

const pathLib = require('path');

const FIXTURES = pathLib.resolve(__dirname, 'fixtures');

const api_dto = {
  access_token: 'secret-token',
  base_url: 'https://api.example.com',
  team_name: 'demo-team',
  string_library_id: 'lib-123'
};

const json_file = (language_code: string) => ({
  language_code: language_code,
  absolute_path: `${FIXTURES}/files/${language_code}/app.json`,
  file_type: {extension: 'json', isSupported: true},
  relative_path: `/files/${language_code}/app.json`,
  source_root_path: `/resources/files/${language_code}/app.json`
});

describe('StringLibrary', () => {
  let http: { post: jest.Mock, get: jest.Mock };

  beforeEach(() => {
    http = {post: jest.fn().mockResolvedValue({data: {}}), get: jest.fn()};
    (axios.create as jest.Mock).mockReturnValue(http);
  });

  it('configures the http client with the team url and bearer token', () => {
    new StringLibrary(api_dto);

    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'https://api.example.com/strings-library/api/v1/teams/demo-team',
      headers: {
        authorization: 'Bearer secret-token',
        accept: 'application/json',
        'content-type': 'application/json'
      }
    });
  });

  describe('syncToLibrary (json push flow)', () => {
    it('builds keys from json files and groups translations under the source file path', async () => {
      const library = new StringLibrary(api_dto);

      await library.syncToLibrary([json_file('en'), json_file('da')], 'en', ['da']);

      expect(http.post).toHaveBeenCalledTimes(1);
      const [url, body] = http.post.mock.calls[0];
      expect(url).toBe('libraries/lib-123/sync');
      expect(body.data.type).toBe('libraries');
      expect(body.data.attributes.source_language).toBe('en');
      expect(body.data.attributes.target_languages).toEqual(['da']);

      const keys = body.data.attributes.keys;
      // The danish file path is normalized onto the source (en) path, so both
      // languages end up under the same key.
      expect(Object.keys(keys).sort()).toEqual([
        'files/en/app.json::app.cta',
        'files/en/app.json::app.title',
        'files/en/app.json::checkout.submit'
      ]);

      const title = keys['files/en/app.json::app.title'];
      expect(title.name).toBe('files/en/app.json::app.title');
      expect(title.external_id).toBe('files/en/app.json::app.title');
      expect(title.strings.en).toEqual({
        text: 'Welcome to our store',
        language_code: 'en',
        external_id: 'files/en/app.json::app.title'
      });
      expect(title.strings.da).toEqual({
        text: 'Velkommen til vores butik',
        language_code: 'da',
        external_id: 'files/en/app.json::app.title'
      });

      // The key only present in the source file has no danish translation.
      expect(keys['files/en/app.json::checkout.submit'].strings.da).toBeUndefined();
    });

    it('does not call the api when there are no keys to sync', async () => {
      const library = new StringLibrary(api_dto);

      await library.syncToLibrary([], 'en', ['da']);

      expect(http.post).not.toHaveBeenCalled();
    });
  });

  describe('getTranslations', () => {
    it('requests the bilingual endpoint with pagination and language filters', async () => {
      http.get.mockResolvedValue({data: {data: [{id: 'key-1'}]}});
      const library = new StringLibrary(api_dto);

      const translations = await library.getTranslations(['da', 'de'], 2, 10);

      expect(http.get).toHaveBeenCalledWith(
        'libraries/lib-123/bilingual?page=2&perPage=10&filters[target_languages][0]=da&filters[target_languages][1]=de'
      );
      expect(translations).toEqual([{id: 'key-1'}]);
    });
  });

  describe('download', () => {
    it('requests a zip with all languages and the flat format', async () => {
      const zip = Buffer.from('zip-content');
      http.post.mockResolvedValue({data: zip});
      const library = new StringLibrary(api_dto);

      const request_dto: any = {
        all_languages: ['da', 'en'],
        download_strings_format: 'flat'
      };
      const content = await library.download(request_dto);

      expect(content).toBe(zip);
      const [url, body, options] = http.post.mock.calls[0];
      expect(url).toBe('libraries/lib-123/download');
      expect(body.data.type).toBe('library-download');
      expect(body.data.attributes.languages).toEqual(['da', 'en']);
      expect(body.data.attributes.options).toEqual({
        exclude_empty_translations: true,
        unpack_strings: false
      });
      expect(options).toEqual({responseType: 'arraybuffer'});
    });

    it('unpacks strings when the nested format is requested', async () => {
      http.post.mockResolvedValue({data: Buffer.from('zip')});
      const library = new StringLibrary(api_dto);

      await library.download({all_languages: ['da'], download_strings_format: 'nested'} as any);

      expect(http.post.mock.calls[0][1].data.attributes.options.unpack_strings).toBe(true);
    });
  });
});
