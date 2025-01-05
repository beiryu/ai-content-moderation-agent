import { INTERVIEW_RESPONSES_MOCKS, InterviewResponse } from "@/mocks/data"
import { atom, useAtom } from "jotai"

type Config = {
  selected: InterviewResponse["id"] | null
}

const configAtom = atom<Config>({
  selected: INTERVIEW_RESPONSES_MOCKS[0].id,
})

export function useInterviewResponse() {
  return useAtom(configAtom)
}
