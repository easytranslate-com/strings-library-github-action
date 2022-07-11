import axios, {AxiosInstance, AxiosResponse} from 'axios';
import {ApiClientConstructor, RequestDto} from "../common/validator";

const GATEWAY_PREFIX = 'strings-library'

export class StringLibrary {
  private readonly base_url: string;
  private readonly library_id: string;
  private http: AxiosInstance;

  constructor(dto: ApiClientConstructor) {
    this.base_url = `${dto.base_url}/${GATEWAY_PREFIX}/api/v1/teams/${dto.team_name}`;
    this.library_id = dto.string_library_id;
    this.http = axios.create({
      baseURL: this.base_url,
      headers: {
        authorization: `Bearer ${dto.access_token}`,
        accept: 'application/json',
        'content-type': 'application/json'
      }
    })
  }

  async syncToLibrary(files: Array<any>, source_language: string, target_languages: Array<string>) {
    const keys = {};
    for (const file of files) {
      const content = await require(file.absolute_path);
      const keyPrefix = StringLibrary.createKeyFromFile(file.relative_path, source_language, file.language_code);
      for (const fileKey in content) {
        const key = `${keyPrefix}::${fileKey}`;
        const value = content[fileKey];
        if (!keys[key]) {
          keys[key] = {strings: {}};
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
      await this.post(
        `libraries/${this.library_id}/sync`,
        {
          type: 'libraries',
          attributes: {source_language, target_languages, keys}
        }
      );
    }
  }

  async* autoPaginatedTranslations(target_languages: string[],) {
    let page = 1;
    let data: Array<any> = await this.getTranslations(target_languages, page);

    while (true) {
      for (const translation of data) {
        yield translation;
      }

      if (data.length === 0) {
        break;
      }

      page += 1;
      data = await this.getTranslations(target_languages, page);
    }
  }

  async getTranslations(target_languages: string[], page: number = 1, per_page: number = 50) {
    let query = `page=${page}&perPage=${per_page}`;
    for (const index in target_languages) {
      query += `&filters[target_languages][${index}]=${target_languages[index]}`;
    }
    const response: any = await this.get(`libraries/${this.library_id}/bilingual?${query}`);

    return response.data;
  }

  async download(request_dto: RequestDto): Promise<Buffer> {
    const response = await this.post(
      `libraries/${this.library_id}/download`,
      {
        type: 'library-download',
        attributes: {
          languages: request_dto.all_languages,
          unpack_strings: request_dto.download_strings_format === 'nested'
        }
      },
      {responseType: "arraybuffer"}
    );
    return response.data;
  }

  private static createKeyFromFile(file: string, source_language: string, language_code: string): string {
    if (file[0] === '/') {
      file = file.slice(1)
    }

    return file.replace(`/${language_code}/`, `/${source_language}/`);
  }

  private async post(path: string, payload: any, options = {}): Promise<AxiosResponse> {
    try {
      return await this.http.post(
        `${path}`,
        {data: payload},
        options
      );
    } catch (error: any) {
      if (error.statusCode < 500) {
        throw Error(error.data.message);
      }
      throw error;
    }
  }

  private async get(path: string) {
    try {
      const response = await this.http.get(path);
      return response.data;
    } catch (error: any) {
      if (error.statusCode < 500) {
        throw Error(error.data.message);
      }
      throw error;
    }
  }
}