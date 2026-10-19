const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'

export type BrevoParams = Record<string, string>

export class BrevoRequestError extends Error {
  readonly status: number
  readonly detail: string

  constructor(status: number, detail: string) {
    super('Brevo')
    this.name = 'BrevoRequestError'
    this.status = status
    this.detail = detail
  }
}

export function brevoTemplateBody(templateId: number, toEmail: string, params: BrevoParams): Record<string, unknown> {
  return {
    templateId,
    to: [{ email: toEmail }],
    params,
  }
}

export async function postBrevoTemplate(
  apiKey: string,
  templateId: number,
  toEmail: string,
  params: BrevoParams,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  let response: Response
  try {
    response = await fetchImpl(BREVO_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(brevoTemplateBody(templateId, toEmail, params)),
    })
  } catch {
    throw new BrevoRequestError(0, 'rete')
  }
  if (response.ok) return
  const detail = (await response.text().catch(() => '')).slice(0, 300)
  throw new BrevoRequestError(response.status, detail)
}
