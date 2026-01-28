import { deepseek } from '@ai-sdk/deepseek'
import { generateText } from 'ai'
import type { Prediction } from './market-types'

const predictionSystemPrompt =
  'You are an analyst for a binary prediction market. Provide calibrated probabilities and concise reasoning.'

const predictionPrompt = (question: string) => `Return JSON only.

Question: "${question}"

Schema:
{
  "yesProbability": number (0-1),
  "noProbability": number (0-1),
  "oddsYes": number (decimal odds, e.g. 1.8),
  "oddsNo": number (decimal odds, e.g. 2.2),
  "reasoning": string (short, 1-2 sentences)
}
`

const resolutionSystemPrompt =
  'You decide the outcome of a binary market. If evidence is unclear, make a best-effort guess.'

const resolutionPrompt = (question: string) => `Return JSON only.

Question: "${question}"

Schema:
{
  "result": "yes" | "no",
  "reasoning": string (short, 1-2 sentences)
}
`

const clampProbability = (value: number) =>
  Math.min(0.99, Math.max(0.01, value))

const probabilityToOdds = (value: number) =>
  Number((1 / clampProbability(value)).toFixed(2))

const parseJsonFromText = (text: string) => {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      return null
    }

    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

export async function getPrediction(question: string): Promise<Prediction> {
  const { text } = await generateText({
    model: deepseek('deepseek-chat'),
    system: predictionSystemPrompt,
    prompt: predictionPrompt(question),
    temperature: 0.2,
  })

  const parsed = parseJsonFromText(text) as Partial<Prediction> | null
  const yesProbability = clampProbability(
    typeof parsed?.yesProbability === 'number' ? parsed.yesProbability : 0.5,
  )
  const noProbability = clampProbability(
    typeof parsed?.noProbability === 'number'
      ? parsed.noProbability
      : 1 - yesProbability,
  )

  return {
    yesProbability,
    noProbability,
    oddsYes:
      typeof parsed?.oddsYes === 'number'
        ? parsed.oddsYes
        : probabilityToOdds(yesProbability),
    oddsNo:
      typeof parsed?.oddsNo === 'number'
        ? parsed.oddsNo
        : probabilityToOdds(noProbability),
    reasoning:
      typeof parsed?.reasoning === 'string'
        ? parsed.reasoning.trim()
        : 'Based on the prompt, this is a rough estimate.',
  }
}

export async function getResolution(question: string): Promise<{
  result: 'yes' | 'no'
  reasoning: string
}> {
  const { text } = await generateText({
    model: deepseek('deepseek-chat'),
    system: resolutionSystemPrompt,
    prompt: resolutionPrompt(question),
    temperature: 0.2,
  })

  const parsed = parseJsonFromText(text) as {
    result?: string
    reasoning?: string
  } | null

  const result =
    parsed?.result === 'yes' || parsed?.result === 'no' ? parsed.result : 'no'

  return {
    result,
    reasoning:
      typeof parsed?.reasoning === 'string'
        ? parsed.reasoning.trim()
        : 'AI fallback resolution.',
  }
}
