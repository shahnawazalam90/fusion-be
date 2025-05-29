import { loadData } from "./yaml-utils"
import * as dotenv from "dotenv"
import * as path from 'path';

dotenv.config({path: path.resolve(__dirname, '..', 'config','.env')});

const testEnv = process.env.ENVIRONMENT || 'default';

const filePaths: { [key: string]: string } = {
  qa: '../data/qa.yml',
  production: '../data/production.yml',
};

export const envData = loadData(filePaths[testEnv] || filePaths['production'])

export function getScreenData(module: string, subModule: string) {
  const screenData = loadData('../data/screenData.yml')
  return screenData[module][subModule]
}
