import { uniqueNamesGenerator, Config, animals, starWars } from 'unique-names-generator';

const nameConfig: Config = {
  dictionaries: [starWars, animals],
  separator: ' ',
  style: 'capital'
};

export const generateAnonymousName = (): string => {
  return uniqueNamesGenerator(nameConfig); // Example: "Clever Panda"
}; 