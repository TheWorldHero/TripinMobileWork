export type HomeFeedStop = {
  id: string;
  title: string;
  placeLabel: string;
  timeLabel: string;
  latitude: number;
  longitude: number;
  images: string[];
};

export type HomeFeedPost = {
  id: string;
  title: string;
  summary: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  authorBio?: string | null;
  cityName: string;
  authorBadge: string;
  avatarLabel: string;
  detailHref: string;
  publishedLabel: string;
  likeCount: number;
  saveCount: number;
  commentCount: number;
  liked: boolean;
  saved: boolean;
  stops: HomeFeedStop[];
};
