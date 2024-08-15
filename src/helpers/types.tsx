export type UserData = {
  userName: string;
  countStoryOfDay: number;
  expiryTime: number;
  stories: Array<{
    nameStory?: string;
    id: string;
    link?: string;
    imageUrl?: string,
    countryId?: string
  }>;
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

export interface CountryInfo {
  locationAndSize: string;
  capitalCity: string;
  language: string;
  cultureAndTraditions: string;
  natureAndWildlife: string;
  friendlyPeople: string;
  food: [];
  festivalsAndHolidays: [];
  funFacts: [];
}

export interface Paragraph {
  paragraph: string;
}

export interface Story {
  title: string;
  imageUrl: string;
  paragraphs: Paragraph[];
}

export interface CountryStoryItem {
  story: Story;
}
