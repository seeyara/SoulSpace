import { uniqueNamesGenerator, Config, adjectives, animals } from 'unique-names-generator';

const nameConfig: Config = {
  dictionaries: [adjectives, animals],
  separator: ' ',
  style: 'capital'
};

export const generateAnonymousName = (): string => {
  return uniqueNamesGenerator(nameConfig); // Example: "Clever Panda"
}; 