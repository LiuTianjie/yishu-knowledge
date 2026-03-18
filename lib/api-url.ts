const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") || ""

export const THREAD_AFFINITY_HEADER = "x-thread-affinity"

export const hasExternalApiBase = Boolean(apiBaseUrl)

export function getThreadAffinityKey(threadId?: string) {
  const normalizedThreadId = threadId?.trim()
  return normalizedThreadId || undefined
}

export function getApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath
}

export function withThreadAffinity(
  headers?: HeadersInit,
  threadId?: string,
) {
  const affinityKey = getThreadAffinityKey(threadId)
  if (!affinityKey) return headers

  const resolvedHeaders = new Headers(headers)
  resolvedHeaders.set(THREAD_AFFINITY_HEADER, affinityKey)
  return resolvedHeaders
}
