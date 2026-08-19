import {
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  Send,
  MessageCircle,
  Music2,
  Linkedin,
  Ghost,
  Pin,
  Twitch,
  Star,
  Heart,
  Eye,
  Users,
  ThumbsUp,
  Share2,
  MessageSquare,
  TrendingUp,
  Zap,
  Film,
  Clapperboard,
  Sparkles,
  Gift,
  Percent,
  Tag,
  Globe,
  PlayCircle,
  UserPlus,
  Repeat,
  Bookmark
} from 'lucide-react'

// Maps an icon "key" (string stored in Supabase) to a lucide-react component.
// Admin picks these keys from a dropdown when creating categories/services -
// nothing here is hard-coded data, only the visual mapping.
export const ICON_MAP = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  twitter: Twitter,
  telegram: Send,
  whatsapp: MessageCircle,
  tiktok: Music2,
  linkedin: Linkedin,
  snapchat: Ghost,
  pinterest: Pin,
  twitch: Twitch,
  star: Star,
  heart: Heart,
  eye: Eye,
  users: Users,
  thumbsup: ThumbsUp,
  share: Share2,
  comment: MessageSquare,
  trending: TrendingUp,
  zap: Zap,
  film: Film,
  clapperboard: Clapperboard,
  sparkles: Sparkles,
  gift: Gift,
  percent: Percent,
  tag: Tag,
  globe: Globe,
  play: PlayCircle,
  userplus: UserPlus,
  repeat: Repeat,
  bookmark: Bookmark
}

export const ICON_KEYS = Object.keys(ICON_MAP)

export function getIcon(key) {
  return ICON_MAP[key] || Globe
}
