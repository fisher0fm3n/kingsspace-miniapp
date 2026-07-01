export type Station = {
  id: number;
  name: string;
  desc: string;
  src: string;
  imgChannel: string;
};

export type VideoItem = {
  id: number | string;
  videoId?: number | string;
  channelId?: string;
  channel_id?: string | number;
  title?: string;
  videos_title?: string;
  body?: string;
  description?: string;
  src?: string;
  url?: string;
  ios_url?: string;
  imgUrl?: string;
  imgChannel?: string;
  thumbnail?: string;
  channel?: string;
  channel_image?: string;
  channel_thumbnail?: string;
  isVerified?: number;
  isShort?: string;
  isLive?: number | string;
  views?: number;
  numOfViews?: number | string;
  uploadtime?: string | number;
  tags?: string[] | string;
  isPost?: boolean;
  link?: string;
  date?: string;
};

export type HomeSection = {
  id: number;
  slug: string;
  title: string;
  data: VideoItem[];
};

export type HomePayload = {
  stations?: Station[];
  sections?: HomeSection[];
  recommended?: { title?: string; data?: VideoItem[] };
  ceclips?: VideoItem[];
};

export type Collection = {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  cover?: string;
};

export type ClipItem = {
  id: string | number;
  url: string;
  ios_url?: string;
  videos_title?: string;
  title?: string;
  likes: number;
  comments?: number;
  liked: boolean;
  isSubscribed: boolean;
  channel: { id: string | number; channel: string; url?: string };
};

export type CurrentUser = {
  id?: number | string;
  userID?: string;
  username?: string;
  fname?: string;
  lname?: string;
  profile_pic?: string;
  token?: string;
  [key: string]: unknown;
};
