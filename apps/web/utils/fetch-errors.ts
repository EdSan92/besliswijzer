export function toUserFacingFetchError(
  error: unknown,
  fallback = 'Er ging iets mis. Probeer het opnieuw.',
): string {
  if (error && typeof error === 'object') {
    const data = (error as { data?: { error?: string } }).data
    if (data?.error === 'Invalid answer for node') {
      return 'Controleer je invoer en probeer het opnieuw.'
    }
    if (data?.error === 'Validation error') {
      return 'Je sessie is verlopen. Ververs de pagina en probeer opnieuw.'
    }
    if (data?.error) {
      return data.error
    }
  }

  return fallback
}

export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
