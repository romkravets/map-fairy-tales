export type UserData = {
  firstName: string;
  lastName: string;
  countStoryDay: 3;
  expiryTime: 0
  stories: [
    {
      id: number
    }
  ]
}

export type StoryData = {
  imageUrl: string;
  paragraphs: [
    {
      paragraph: string
    }
  ];
  title: string
};

export type StoryItem = {
  id: number,
  regionName: string;
  story: StoryData;
  userId?: string;
  regionId: string;
  like: number;
  status: boolean;
};

export type ItemCountryMap = {
  id: string;
  info: {
    locationAndSize: string,
    language: string,
    food: [],
    cultureAndTraditions: string,
    festivalsAndHolidays: [],
    natureAndWildlife: string,
    funFacts: [],
    friendlyPeople: string
  };
  stories: StoryItem[];
};
