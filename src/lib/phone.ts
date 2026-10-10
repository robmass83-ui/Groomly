export function whatsAppLink(phone: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (!(digits.startsWith('39') && digits.length >= 11)) {
    digits = digits.startsWith('0') ? `39${digits.slice(1)}` : `39${digits}`
  }
  return `https://wa.me/${digits}`
}
