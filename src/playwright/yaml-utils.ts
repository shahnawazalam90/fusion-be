import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

export function loadData(filePath: string): any {
    try{
        const file = fs.readFileSync(path.resolve(__dirname, filePath), 'utf-8')

        return yaml.load(file);
    }catch(error) {
        console.error(`error reading / parsing YAML file: ${filePath} `, error)
        throw error;
    }
}
