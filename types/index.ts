export interface VideoRef {
  bvid: string
  title: string
  start_str: string
  url: string
  score: number
  cover?: string
}

export interface Session {
  id: string
  title: string
  createdAt: number
}
