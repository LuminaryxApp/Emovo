export interface Post {
  id: string;
  userId: string;
  content: string;
  moodScore: number | null;
  type: "mood_update" | "tip" | "photo";
  imageUrl: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PostWithAuthor extends Post {
  author: {
    id: string;
    displayName: string;
  };
  isLiked: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  author: {
    id: string;
    displayName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  gradientStart: string;
  gradientEnd: string;
  isPublic: boolean;
  memberCount: number;
  createdBy: string;
  createdAt: string;
}

export interface GroupWithMembership extends Group {
  isMember: boolean;
  role: "admin" | "moderator" | "member" | null;
  unreadCount: number;
}

export interface GroupMember {
  id: string;
  userId: string;
  displayName: string;
  role: "admin" | "moderator" | "member";
  joinedAt: string;
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  groupId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationPreview extends Conversation {
  name: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isOnline: boolean;
  participantIds: string[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: "text" | "image" | "system";
  createdAt: string;
}
