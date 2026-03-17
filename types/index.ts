export interface VideoRef {
  bvid: string
  title: string
  start_str: string
  url: string
  score: number
  cover?: string
}

export interface Thread {
  id: string
  title?: string
  resourceId: string
  createdAt: string
  updatedAt: string
  metadata?: Record<string, unknown>
}
