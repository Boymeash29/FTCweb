export type Team = {
  slug: string;
  name: string;
  number: string;
};

export const teams: Team[] = [
  { slug: "buzzerbots", name: "BuzzerBots", number: "23826" },
  { slug: "hive-mind", name: "Hive Mind", number: "36438" },
];

export function getTeam(slug: string) {
  return teams.find((team) => team.slug === slug);
}
