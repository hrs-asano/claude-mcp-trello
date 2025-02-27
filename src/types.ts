export interface TrelloConfig {
  apiKey: string;
  token: string;
  boardId: string;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  due: string | null;
  idList: string;
  idLabels: string[];
  closed: boolean;
  url: string;
  dateLastActivity: string;
}

export interface TrelloList {
  id: string;
  name: string;
  closed: boolean;
  idBoard: string;
  pos: number;
}

export interface TrelloAction {
  id: string;
  idMemberCreator: string;
  type: string;
  date: string;
  data: {
    text?: string;
    card?: {
      id: string;
      name: string;
    };
    list?: {
      id: string;
      name: string;
    };
    board: {
      id: string;
      name: string;
    };
  };
  memberCreator: {
    id: string;
    fullName: string;
    username: string;
  };
}

export interface TrelloLabel {
  id: string;
  name: string;
  color: string;
}

export interface TrelloMember {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
}

export interface RateLimiter {
  canMakeRequest(): boolean;
  waitForAvailableToken(): Promise<void>;
}
