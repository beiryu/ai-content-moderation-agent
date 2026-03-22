import { db } from "@/lib/db"
import openai from "@/lib/openai"

/**
 * Returns the existing vector store ID for a user, or creates a new one
 * and persists it to the User row. Safe to call multiple times (idempotent).
 */
export async function getOrCreateVectorStore(userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { openaiVectorStoreId: true },
  })

  if (user?.openaiVectorStoreId) {
    // Verify the store still exists on OpenAI (guard against manual dashboard deletion)
    try {
      await openai.vectorStores.retrieve(user.openaiVectorStoreId)
      return user.openaiVectorStoreId
    } catch {
      // Store was deleted externally — fall through to create a new one
    }
  }

  const vectorStore = await openai.vectorStores.create({
    name: `user-${userId}`,
  })

  await db.user.update({
    where: { id: userId },
    data: { openaiVectorStoreId: vectorStore.id },
  })

  return vectorStore.id
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
 * Returns undefined when documentIds is empty (search all files in store).
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
