"use client"

import type React from "react"
import { useState, useRef, useEffect, useMemo } from "react"
import { Search, CircleDot, Crosshair, SlidersHorizontal } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

const GooeyFilter = () => (
  <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
    <defs>
      <filter id="gooey-effect">
        <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
        <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -8" result="goo" />
        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
      </filter>
    </defs>
  </svg>
)

interface SearchBarProps {
  placeholder?: string
  onSearch?: (query: string) => void
  onPlaceSelect?: (placeId: string, description: string) => void
  predictions?: google.maps.places.AutocompletePrediction[]
  recentSearches?: string[]
  searchText?: string
  onRecentSearchSelect?: (search: string) => void
  inputValue?: string
  onInputChange?: (value: string) => void
  onLocateMe?: () => void
  onOpenFilters?: () => void
  filterCount?: number
}

const SearchBar = ({
  placeholder = "Search location...",
  onSearch,
  onPlaceSelect,
  predictions = [],
  recentSearches = [],
  searchText = "",
  onRecentSearchSelect,
  inputValue = "",
  onInputChange,
  onLocateMe,
  onOpenFilters,
  filterCount = 0,
}: SearchBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState(inputValue || searchText)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isClicked, setIsClicked] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  const isUnsupportedBrowser = useMemo(() => {
    if (typeof window === "undefined") return false
    const ua = navigator.userAgent.toLowerCase()
    const isSafari = ua.includes("safari") && !ua.includes("chrome") && !ua.includes("chromium")
    const isChromeOniOS = ua.includes("crios")
    return isSafari || isChromeOniOS
  }, [])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    onInputChange?.(value)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery)
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 1000)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isFocused) {
      const rect = e.currentTarget.getBoundingClientRect()
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
    setIsClicked(true)
    setTimeout(() => setIsClicked(false), 800)
  }

  useEffect(() => {
    setSearchQuery(inputValue || searchText)
  }, [inputValue, searchText])

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isFocused])

  const showDropdown = isFocused && (predictions.length > 0 || recentSearches.length > 0)

  const searchIconVariants = {
    initial: { scale: 1 },
    animate: {
      rotate: isAnimating ? [0, -15, 15, -10, 10, 0] : 0,
      scale: isAnimating ? [1, 1.3, 1] : 1,
      transition: { duration: 0.6, ease: "easeInOut" as const },
    },
  }

  const suggestionVariants = {
    hidden: (i: number) => ({
      opacity: 0,
      y: -10,
      scale: 0.95,
      transition: { duration: 0.15, delay: i * 0.05 },
    }),
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring" as const, stiffness: 300, damping: 15, delay: i * 0.07 },
    }),
    exit: (i: number) => ({
      opacity: 0,
      y: -5,
      scale: 0.9,
      transition: { duration: 0.1, delay: i * 0.03 },
    }),
  }

  const particles = Array.from({ length: isFocused ? 18 : 0 }, (_, i) => (
    <motion.div
      key={i}
      initial={{ scale: 0 }}
      animate={{
        x: [0, (Math.random() - 0.5) * 40],
        y: [0, (Math.random() - 0.5) * 40],
        scale: [0, Math.random() * 0.8 + 0.4],
        opacity: [0, 0.8, 0],
      }}
      transition={{
        duration: Math.random() * 1.5 + 1.5,
        ease: "easeInOut",
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "reverse",
      }}
      className="absolute w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
      style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        filter: "blur(2px)",
      }}
    />
  ))

  const clickParticles = isClicked
    ? Array.from({ length: 14 }, (_, i) => (
        <motion.div
          key={`click-${i}`}
          initial={{ x: mousePosition.x, y: mousePosition.y, scale: 0, opacity: 1 }}
          animate={{
            x: mousePosition.x + (Math.random() - 0.5) * 160,
            y: mousePosition.y + (Math.random() - 0.5) * 160,
            scale: Math.random() * 0.8 + 0.2,
            opacity: [1, 0],
          }}
          transition={{ duration: Math.random() * 0.8 + 0.5, ease: "easeOut" }}
          className="absolute w-3 h-3 rounded-full"
          style={{
            background: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 200) + 55}, ${Math.floor(Math.random() * 255)}, 0.8)`,
            boxShadow: "0 0 8px rgba(255, 255, 255, 0.8)",
          }}
        />
      ))
    : null

  return (
    <div className="relative w-full">
      <GooeyFilter />
      <motion.form
        onSubmit={handleSubmit}
        className="relative flex items-center justify-center w-full mx-auto"
        initial={{ width: "100%" }}
        animate={{ width: "100%", scale: isFocused ? 1.02 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        onMouseMove={handleMouseMove}
      >
        <motion.div
          className={cn(
            "flex items-center w-full rounded-full border relative overflow-hidden bg-white",
            isFocused ? "border-transparent shadow-xl" : "border-gray-200"
          )}
          animate={{
            boxShadow: isClicked
              ? "0 0 40px rgba(139, 92, 246, 0.5), 0 0 15px rgba(236, 72, 153, 0.7) inset"
              : isFocused
              ? "0 15px 35px rgba(0, 0, 0, 0.2)"
              : "0 2px 12px rgba(0,0,0,0.08)",
          }}
          onClick={handleClick}
        >
          {isFocused && (
            <motion.div
              className="absolute inset-0 -z-10 rounded-full"
              initial={{ opacity: 0 }}
              animate={{
                opacity: 0.12,
                background: [
                  "linear-gradient(90deg, #f6d365 0%, #fda085 100%)",
                  "linear-gradient(90deg, #a1c4fd 0%, #c2e9fb 100%)",
                  "linear-gradient(90deg, #d4fc79 0%, #96e6a1 100%)",
                  "linear-gradient(90deg, #f6d365 0%, #fda085 100%)",
                ],
              }}
              transition={{ duration: 15, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            />
          )}

          <div
            className="absolute inset-0 overflow-hidden rounded-full"
            style={{ filter: isUnsupportedBrowser ? "none" : "url(#gooey-effect)" }}
          >
            {particles}
          </div>

          {isClicked && (
            <>
              <motion.div
                className="absolute inset-0 -z-5 rounded-full bg-purple-400/10"
                initial={{ scale: 0, opacity: 0.7 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              <motion.div
                className="absolute inset-0 -z-5 rounded-full bg-white/20"
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </>
          )}

          {clickParticles}

          <motion.div className="pl-4 py-2.5" variants={searchIconVariants} initial="initial" animate="animate">
            <Search
              size={18}
              strokeWidth={isFocused ? 2.5 : 2}
              className={cn(
                "transition-all duration-300",
                isAnimating ? "text-purple-500" : isFocused ? "text-purple-600" : "text-gray-500",
              )}
            />
          </motion.div>

          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={handleSearch}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            className={cn(
              "w-full py-2.5 bg-transparent outline-none placeholder:text-gray-400 font-medium text-base relative z-10 min-w-0",
              isFocused ? "text-gray-800 tracking-wide" : "text-gray-600"
            )}
          />

          {onLocateMe && (
            <motion.button
              type="button"
              onClick={onLocateMe}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center justify-center w-8 h-8 mr-0.5 rounded-full bg-white text-gray-600 border border-gray-200 hover:border-gray-400 hover:text-gray-900 hover:shadow-md transition-all duration-200 shrink-0"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
            >
              <span className="relative flex items-center justify-center">
                <Crosshair size={15} strokeWidth={1.8} />
                <span className="absolute w-[5px] h-[5px] rounded-full bg-blue-500 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </span>
            </motion.button>
          )}

          {onOpenFilters && (
            <motion.button
              type="button"
              onClick={onOpenFilters}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative flex items-center gap-1.5 px-3 h-8 mr-1 text-xs font-medium rounded-full bg-white text-gray-600 border border-gray-200 hover:border-gray-400 hover:text-gray-900 hover:shadow-md transition-all duration-200 shrink-0"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <SlidersHorizontal size={14} strokeWidth={1.8} />
              <span className="hidden sm:inline">Filters</span>
              {filterCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-gray-900 px-[3px] text-[8px] font-semibold text-white">
                  {filterCount}
                </span>
              )}
            </motion.button>
          )}

          <AnimatePresence>
            {searchQuery && (
              <motion.button
                type="submit"
                initial={{ opacity: 0, scale: 0.8, x: -20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: -20 }}
                whileHover={{
                  scale: 1.05,
                  background: "linear-gradient(45deg, #8B5CF6 0%, #EC4899 100%)",
                  boxShadow: "0 10px 25px -5px rgba(139, 92, 246, 0.5)",
                }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-1.5 mr-1.5 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white transition-all shadow-lg shrink-0"
              >
                Search
              </motion.button>
            )}
          </AnimatePresence>

          {isFocused && (
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.1, 0.2, 0.1, 0],
                background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.8) 0%, transparent 70%)",
              }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, repeatType: "loop" }}
            />
          )}
        </motion.div>
      </motion.form>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 overflow-hidden bg-white rounded-lg shadow-xl border border-gray-100"
            style={{
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            <div className="p-2">
              {predictions.length > 0 ? (
                predictions.map((item, index) => (
                  <motion.div
                    key={item.place_id}
                    custom={index}
                    variants={suggestionVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onMouseDown={() => onPlaceSelect?.(item.place_id, item.description)}
                    className="flex items-center gap-2 px-4 py-2.5 cursor-pointer rounded-md hover:bg-purple-50 group"
                  >
                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ delay: index * 0.06 }}>
                      <CircleDot size={14} className="text-purple-400 group-hover:text-purple-600 shrink-0" />
                    </motion.div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-gray-800 group-hover:text-purple-700">
                        {item.structured_formatting.main_text}
                      </span>
                      {item.structured_formatting.secondary_text && (
                        <span className="ml-1 text-xs text-gray-400">, {item.structured_formatting.secondary_text}</span>
                      )}
                    </div>
                  </motion.div>
                ))
              ) : recentSearches.length > 0 ? (
                <>
                  <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Recently Searched
                  </p>
                  {recentSearches.map((search, index) => (
                    <motion.div
                      key={index}
                      custom={index}
                      variants={suggestionVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      onMouseDown={() => onRecentSearchSelect?.(search)}
                      className="flex items-center gap-2 px-4 py-2.5 cursor-pointer rounded-md hover:bg-gray-50 group"
                    >
                      <span className="text-sm text-gray-500 shrink-0">🕐</span>
                      <span className="text-sm text-gray-700 truncate">{search}</span>
                    </motion.div>
                  ))}
                </>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { SearchBar }
