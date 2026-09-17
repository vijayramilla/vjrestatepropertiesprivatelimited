import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export interface DateTimeSelection {
  date: Date;
  time: string;
}

interface AppleCalendarPickerProps {
  /** Date the calendar opens on / highlights. Defaults to today. */
  initialDate?: Date;
  /** Days before this date are disabled (booking cannot be in the past). */
  minDate?: Date;
  /** Fired whenever the user picks a day or changes the time. */
  onDateTimeSelect?: (selection: DateTimeSelection) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const CELL_PX = 36; // w-9 h-9
const ROW_GAP_PX = 4; // gap-y-1

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

/** Keep the selected day valid for the target month (e.g. 31 -> 30 when moving from a 31-day month). */
const clampDay = (day: number, year: number, month: number) =>
  Math.min(day, getDaysInMonth(year, month));

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function AppleCalendarPicker({
  initialDate,
  minDate,
  onDateTimeSelect,
}: AppleCalendarPickerProps) {
  const today = initialDate ? startOfDay(initialDate) : startOfDay(new Date());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  // Dropdown toggle state
  const [showDropdown, setShowDropdown] = useState(false);

  // Time states
  const [hours, setHours] = useState('10');
  const [minutes, setMinutes] = useState('00');
  const [ampm, setAmpm] = useState('AM');

  // Track dark class so hover/scroll styles stay consistent (read-only; never toggles site theme)
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  // Grid height computed from the real row count so 6-row months are never clipped
  const rowCount = Math.ceil((firstDayIndex + daysInMonth) / 7);
  const gridHeight = rowCount * CELL_PX + (rowCount - 1) * ROW_GAP_PX;

  const triggerSelect = (day: number, hh: string, mm: string, ampmVal: string) => {
    if (!onDateTimeSelect) return;
    const safeDay = clampDay(day, currentYear, currentMonth);
    const formattedDate = new Date(currentYear, currentMonth, safeDay);
    onDateTimeSelect({
      date: formattedDate,
      time: `${hh.padStart(2, '0')}:${mm.padStart(2, '0')} ${ampmVal}`,
    });
  };

  const prevMonth = () => {
    const m = currentMonth === 0 ? 11 : currentMonth - 1;
    const y = currentMonth === 0 ? currentYear - 1 : currentYear;
    setCurrentMonth(m);
    setCurrentYear(y);
    setSelectedDay((d) => clampDay(d, y, m));
  };

  const nextMonth = () => {
    const m = currentMonth === 11 ? 0 : currentMonth + 1;
    const y = currentMonth === 11 ? currentYear + 1 : currentYear;
    setCurrentMonth(m);
    setCurrentYear(y);
    setSelectedDay((d) => clampDay(d, y, m));
  };

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    triggerSelect(day, hours, minutes, ampm);
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);
    const num = parseInt(val, 10);
    if (val !== '' && !Number.isNaN(num) && num > 12) val = '12';
    setHours(val);
    triggerSelect(selectedDay, val || '12', minutes, ampm);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);
    const num = parseInt(val, 10);
    if (val !== '' && !Number.isNaN(num) && num > 59) val = '59';
    setMinutes(val);
    triggerSelect(selectedDay, hours, val || '00', ampm);
  };

  /** Pad / normalise time inputs once the user leaves the field. */
  const handleTimeBlur = (
    value: string,
    setter: (v: string) => void,
    { max, fallback }: { max: number; fallback: string },
  ) => {
    let val = value;
    const num = parseInt(val, 10);
    if (val === '' || Number.isNaN(num)) {
      val = fallback;
    } else {
      if (num === 0) val = max === 12 ? '12' : '00';
      else if (num > max) val = String(max);
      else val = String(num).padStart(2, '0');
    }
    setter(val);
    if (max === 12) triggerSelect(selectedDay, val, minutes, ampm);
    else triggerSelect(selectedDay, hours, val, ampm);
  };

  const handleAmpmChange = (newAmpm: string) => {
    setAmpm(newAmpm);
    triggerSelect(selectedDay, hours, minutes, newAmpm);
  };

  const todayMidnight = minDate ? startOfDay(minDate) : null;

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="h-9 w-9" />);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = day === selectedDay;
      const dayDate = new Date(currentYear, currentMonth, day);
      const isPast = todayMidnight ? dayDate < todayMidnight : false;
      days.push(
        <button
          key={`day-${day}`}
          type="button"
          onClick={() => handleSelectDay(day)}
          disabled={isPast}
          className={`relative flex h-9 w-9 items-center justify-center rounded-full text-[15px] transition-all focus:outline-none ${
            isSelected
              ? 'z-10 scale-105 bg-[#0A1628] font-semibold text-white shadow-md'
              : isPast
                ? 'cursor-not-allowed text-[#d4d4d8]'
                : 'font-medium text-[#0A1628] hover:bg-[#C9A84C]/15'
          }`}
        >
          {!isSelected && !isPast && dayDate.getTime() === startOfDay(new Date()).getTime() && (
            <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#C9A84C]" />
          )}
          {day}
        </button>,
      );
    }
    return days;
  };

  return (
    <div className="w-[300px] animate-calendar-pop overflow-hidden rounded-[20px] border border-[#e8e8e8] bg-white p-[16px] font-sans shadow-[0_12px_32px_rgba(10,22,40,0.10)]">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1 text-[16px] font-semibold text-[#0A1628] transition-opacity hover:opacity-70 focus:outline-none"
        >
          <span>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <span
            className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : 'rotate-0'}`}
          >
            <ChevronDown size={12} strokeWidth={2.5} />
          </span>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Previous month"
            className="rounded-full p-1.5 text-[#0A1628] transition-colors hover:bg-[#C9A84C]/15 focus:outline-none"
          >
            <ChevronLeft size={15} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="Next month"
            className="rounded-full p-1.5 text-[#0A1628] transition-colors hover:bg-[#C9A84C]/15 focus:outline-none"
          >
            <ChevronRight size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 justify-items-center gap-y-1 text-center">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-[10px] font-bold tracking-wider text-[#999]">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid & month/year dropdown */}
      <div className="relative mb-3" style={{ height: gridHeight }}>
        <div className="absolute z-10 grid w-full grid-cols-7 justify-items-center gap-y-1">
          {renderDays()}
        </div>

        {showDropdown && (
          <div
            className={`absolute inset-0 z-30 flex flex-col rounded-[16px] p-3 backdrop-blur-md ${
              isDark ? 'bg-[#1C1C1E]/95' : 'bg-white/95'
            }`}
          >
            <div className="mb-2 flex items-center justify-between border-b border-[#f0f0f0] pb-2">
              <button
                type="button"
                onClick={() => setCurrentYear((y) => y - 1)}
                aria-label="Previous year"
                className="rounded-full p-1.5 text-[#0A1628] transition-colors hover:bg-[#C9A84C]/15"
              >
                <ChevronLeft size={14} strokeWidth={2.5} />
              </button>
              <span className="text-[15px] font-bold text-[#0A1628]">{currentYear}</span>
              <button
                type="button"
                onClick={() => setCurrentYear((y) => y + 1)}
                aria-label="Next year"
                className="rounded-full p-1.5 text-[#0A1628] transition-colors hover:bg-[#C9A84C]/15"
              >
                <ChevronRight size={14} strokeWidth={2.5} />
              </button>
            </div>

            <div className="grid flex-1 grid-cols-3 gap-1.5 overflow-y-auto">
              {MONTH_NAMES.map((m, idx) => {
                const isSelected = idx === currentMonth;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setCurrentMonth(idx);
                      setSelectedDay((d) => clampDay(d, currentYear, idx));
                      setShowDropdown(false);
                    }}
                    className={`rounded-lg py-1.5 text-[11px] font-bold transition-all ${
                      isSelected
                        ? 'bg-[#0A1628] text-white shadow-sm'
                        : 'text-[#0A1628] hover:bg-[#C9A84C]/15'
                    }`}
                  >
                    {m.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Time row */}
      <div className="flex items-center justify-between border-t border-[#f0f0f0] pt-3">
        <span className="text-[15px] font-semibold text-[#0A1628]">Time</span>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-[#F5F5F5] px-2 py-1 text-[15px] font-medium text-[#0A1628]">
            <input
              type="text"
              inputMode="numeric"
              value={hours}
              onChange={handleHourChange}
              onBlur={(e) =>
                handleTimeBlur(e.target.value, setHours, { max: 12, fallback: '10' })
              }
              placeholder="00"
              aria-label="Hour"
              className="w-6 bg-transparent text-center font-semibold focus:outline-none"
            />
            <span className="opacity-60">:</span>
            <input
              type="text"
              inputMode="numeric"
              value={minutes}
              onChange={handleMinuteChange}
              onBlur={(e) =>
                handleTimeBlur(e.target.value, setMinutes, { max: 59, fallback: '00' })
              }
              placeholder="00"
              aria-label="Minute"
              className="w-6 bg-transparent text-center font-semibold focus:outline-none"
            />
          </div>

          <div className="flex rounded-lg bg-[#F5F5F5] p-[2px] text-[12px] font-semibold text-[#0A1628]">
            <button
              type="button"
              onClick={() => handleAmpmChange('AM')}
              className={`rounded-md px-2.5 py-1 transition-all focus:outline-none ${
                ampm === 'AM' ? 'bg-white shadow-sm' : 'opacity-55 hover:opacity-90'
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => handleAmpmChange('PM')}
              className={`rounded-md px-2.5 py-1 transition-all focus:outline-none ${
                ampm === 'PM' ? 'bg-white shadow-sm' : 'opacity-55 hover:opacity-90'
              }`}
            >
              PM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppleCalendarPicker;
