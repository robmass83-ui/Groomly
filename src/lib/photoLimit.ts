export const MAX_DOG_PHOTOS = 20
export const TOO_MANY_PHOTOS = 'Puoi caricare al massimo 20 foto per cane.'

export function dogPhotoCount(dog: { photo?: string; gallery: { photo: string }[] }): number {
  return new Set([dog.photo, ...dog.gallery.map((item) => item.photo)].filter((photo): photo is string => !!photo)).size
}
