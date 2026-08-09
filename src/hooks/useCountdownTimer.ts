import { useState, useEffect } from 'react'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
  isEndingSoon: boolean // less than 1 hour
}

export function useCountdownTimer(
  endTime: Date | null | undefined
): TimeLeft {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0, hours: 0, minutes: 0, seconds: 0,
    isExpired: false, isEndingSoon: false
  })

  useEffect(() => {
    if (!endTime) return

    const calculate = () => {
      const now = new Date().getTime()
      const end = endTime.getTime()
      const diff = end - now

      if (diff <= 0) {
        setTimeLeft({
          days: 0, hours: 0, minutes: 0, seconds: 0,
          isExpired: true, isEndingSoon: false
        })
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      )
      const minutes = Math.floor(
        (diff % (1000 * 60 * 60)) / (1000 * 60)
      )
      const seconds = Math.floor(
        (diff % (1000 * 60)) / 1000
      )
      const isEndingSoon = diff < 60 * 60 * 1000

      setTimeLeft({
        days, hours, minutes, seconds,
        isExpired: false, isEndingSoon
      })
    }

    calculate()
    const interval = setInterval(calculate, 1000)
    return () => clearInterval(interval)
  }, [endTime])

  return timeLeft
}
