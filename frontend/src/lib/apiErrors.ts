const FIELD_LABELS: Record<string, string> = {
  email: 'Email',
  password: 'Password',
  password_confirm: 'Confirm password',
  new_password: 'New password',
  first_name: 'First name',
  last_name: 'Last name',
  phone: 'Phone',
  role: 'Role',
  company_name: 'Company name',
}

/**
 * Turns a DRF error response into one readable sentence.
 * Handles { detail }, { error }, { message }, { non_field_errors: [] } and { field: [msg] } shapes.
 */
export function formatApiError(err: any, fallback: string): string {
  const data = err?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return fallback

  for (const key of ['detail', 'error', 'message']) {
    if (typeof data[key] === 'string') return data[key]
  }

  if (Array.isArray(data.non_field_errors) && data.non_field_errors.length) {
    return data.non_field_errors[0]
  }

  const field = Object.keys(data)[0]
  if (!field) return fallback
  const value = Array.isArray(data[field]) ? data[field][0] : data[field]
  if (typeof value !== 'string') return fallback
  const label = FIELD_LABELS[field]
  return label ? `${label}: ${value}` : value
}
