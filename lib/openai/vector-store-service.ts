import { db } from "@/lib/db"
import openai from "@/lib/openai"
import redis from "@/lib/redis"

const VS_CACHE_TTL = 86400 // 24 hours
const DOCS_CACHE_TTL = 300 // 5 minutes

/**
 * Returns the existing vector store ID for a user, or creates a new one
 * and persists it to the User row. Safe to call multiple times (idempotent).
 * Result is cached in Redis for 24h to avoid DB + OpenAI round-trips.
 */
export async function getOrCreateVectorStore(userId: string): Promise<string> {
  const cacheKey = `vs:${userId}`

  const cached = await redis.get(cacheKey)
  if (cached) return cached

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { openaiVectorStoreId: true },
  })

  if (user?.openaiVectorStoreId) {
    await redis.set(cacheKey, user.openaiVectorStoreId, "EX", VS_CACHE_TTL)
    return user.openaiVectorStoreId
  }

  const vectorStore = await openai.vectorStores.create({
    name: `user-${userId}`,
  })

  await db.user.update({
    where: { id: userId },
    data: { openaiVectorStoreId: vectorStore.id },
  })

  await redis.set(cacheKey, vectorStore.id, "EX", VS_CACHE_TTL)

  return vectorStore.id
}

type UserDoc = { id: string; title: string; openaiFileId: string | null }

/**
 * Returns document metadata for a user, cached in Redis for 5 minutes.
 * Pass `documentIds` to filter to specific documents.
 * Call `invalidateUserDocsCache(userId)` after any document mutation.
 */
export async function getCachedUserDocs(
  userId: string,
  documentIds?: string[]
): Promise<UserDoc[]> {
  const cacheKey = `docs:${userId}`

  const cached = await redis.get(cacheKey)
  let allDocs: UserDoc[]

  if (cached) {
    allDocs = JSON.parse(cached)
  } else {
    allDocs = await db.document.findMany({
      where: { userId, openaiFileId: { not: null } },
      select: { id: true, title: true, openaiFileId: true },
    })
    await redis.set(cacheKey, JSON.stringify(allDocs), "EX", DOCS_CACHE_TTL)
  }

  if (documentIds?.length) {
    const idSet = new Set(documentIds)
    return allDocs.filter((d) => idSet.has(d.id))
  }
  return allDocs
}

/**
 * Invalidates the document metadata cache for a user.
 * Call after any document upload, update, or delete.
 */
export async function invalidateUserDocsCache(userId: string): Promise<void> {
  await redis.del(`docs:${userId}`)
}

/**
 * Uploads file content to the OpenAI Files API and attaches it to
 * the user's vector store with a document_id attribute for filtering.
 * Returns the OpenAI file ID.
 */
export async function addFileToVectorStore(
  content: string,
  fileName: string,
  documentId: string,
  vectorStoreId: string
): Promise<string> {
  const blob = new Blob([content], { type: "text/plain" })
  const file = new File([blob], `${fileName}.txt`, { type: "text/plain" })

  // purpose must be "assistants" for use with vector stores
  const uploadedFile = await openai.files.create({
    file,
    purpose: "assistants",
  })

  await openai.vectorStores.files.create(vectorStoreId, {
    file_id: uploadedFile.id,
    // @ts-ignore — attributes supported in recent SDK versions
    attributes: { document_id: documentId },
  })

  return uploadedFile.id
}

/**
 * Removes a file from both the vector store link and the Files API.
 * Fails silently if already gone (idempotent).
 */
export async function removeFileFromVectorStore(
  openaiFileId: string,
  vectorStoreId: string
): Promise<void> {
  try {
    await openai.vectorStores.files.del(vectorStoreId, openaiFileId)
  } catch (err) {
    console.error("Error removing file from vector store:", err)
  }

  try {
    await openai.files.del(openaiFileId)
  } catch (err) {
    console.error("Error deleting file from Files API:", err)
  }
}

/**
 * Builds the OpenAI file_search filter for a set of document IDs.
 * Document Chat only calls file_search when the user has selected ≥1 doc; callers must not pass an empty list.
 */
export function buildFileSearchFilter(
  documentIds: string[]
): object | undefined {
  if (!documentIds || documentIds.length === 0) return undefined

  if (documentIds.length === 1) {
    return { type: "eq", key: "document_id", value: documentIds[0] }
  }

  return {
    type: "or",
    filters: documentIds.map((id) => ({
      type: "eq",
      key: "document_id",
      value: id,
    })),
  }
}
