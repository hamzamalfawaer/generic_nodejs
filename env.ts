/* eslint-disable no-process-env */
import * as dotenv from 'dotenv';
dotenv.config();

export class EnvironmentVariables {
  APIURL: string = ((process.env.APIURL || 'https://4001.hoteladvisor.net') + '/').replace(/\/\/$/, '/');
  PORT: number = process.env.PORT ? +process.env.PORT : 8000;
}

let _environmentVariables: EnvironmentVariables;
export const env = <T extends keyof EnvironmentVariables>(envName: T): EnvironmentVariables[T] => {
  if (!_environmentVariables) {
    _environmentVariables = new EnvironmentVariables();
  }
  return _environmentVariables[envName];
};
