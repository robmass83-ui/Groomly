export const SIZES = {
  pagePadX: 12,
  sectionGap: 9,
  headerIconBtn: 30,
  headerIconRadius: 9,
  search: { h: 32, radius: 9 },
  row: { padY: 7, padX: 9, minH: 44 },
  card: { radius: 12, border: 1 },
  chip: { padY: 3, padX: 6, font: 10.5, iconInChip: 14, serviceIconInChip: 13, radius: 999 },
  avatar: { sm: 28, md: 36, lg: 46, xl: 84, grid: 52 },
  temperamentIcon: { row: 25, grid: 23, calendar: 18, title: 18, banner: 28, legend: 50 },
  serviceIcon: { row: 19 },
  button: { h: 26, hLg: 34, radius: 7, radiusLg: 9 },
  bottomNav: { h: 58, icon: 19, fab: 42, fabRadius: 14 },
  sheet: { radiusTop: 18, grab: { w: 34, h: 4 } },
  calendar: { hourHeight: 50, startHour: 8, endHour: 19, gutter: 34 },
} as const

export const AVATAR_RADIUS = { sm: 8, md: 10, lg: 12, xl: 20, grid: 14 } as const
