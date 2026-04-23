import fs from 'fs';
import yaml from 'js-yaml';

export class ConfigLoader {
  private config: any;
  constructor(configPath: string) {
    this.config = yaml.load(fs.readFileSync(configPath, 'utf8'));
  }
  getConfig() {
    return this.config;
  }
}
