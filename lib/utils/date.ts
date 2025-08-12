// Helper function to convert Date to local YYYY-MM-DD string
export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Helper function to convert Date object (UTC) to local date string
export const convertUtcToLocalDate = (utcDate: Date, timeZone: string): string => {
  const localDate = new Date(utcDate.toLocaleString("en-US", { timeZone }))
  return formatLocalDate(localDate)
}

export const getBreakDuration = (focusDuration: number): number => {
  if (focusDuration <= 25) return 5
  if (focusDuration <= 50) return 10
  return 15
}
