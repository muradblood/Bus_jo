import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  minDate?: string;
}

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'اختر التاريخ',
  label,
  required = false,
  minDate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      setViewDate(new Date(y, m - 1, 1));
    }
  }, [value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const effectiveMinDate = minDate || todayStr;

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const selectDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    const [sy, sm, sd] = value.split('-').map(Number);
    return sy === year && sm === month + 1 && sd === day;
  };

  const isToday = (day: number) => {
    const [ty, tm, td] = todayStr.split('-').map(Number);
    return ty === year && tm === month + 1 && td === day;
  };

  const isBeforeMinDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr < effectiveMinDate;
  };

  // Build calendar cells
  const cells: { type: 'prev' | 'day' | 'next'; day: number }[] = [];
  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ type: 'prev', day: prevMonthDays - i });
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ type: 'day', day: d });
  }
  // Next month leading days
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ type: 'next', day: i });
  }

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-bold text-charcoal mb-2 text-right">
          {required && <span className="text-red-500 ml-1">*</span>}
          {label}
        </label>
      )}

      {/* Input Field */}
      <div
        className="relative cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <input
          type="text"
          value={formatDisplayDate(value)}
          readOnly
          placeholder={placeholder}
          className="w-full h-[56px] px-5 border border-[#E5E0D5] rounded-2xl text-right focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 transition-all text-charcoal placeholder:text-[#B5AFA3] text-base bg-[#FCFBF9] hover:bg-white cursor-pointer"
        />
        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gold pointer-events-none" />
      </div>

      {/* Calendar Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-[#E5E0D5] overflow-hidden animate-fade-scale" style={{ maxWidth: '340px', margin: '8px auto 0' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0EDE4]">
            <button
              onClick={prevMonth}
              className="w-8 h-8 rounded-full bg-[#F8F6F2] flex items-center justify-center text-[#8A7E6B] hover:text-brand-gold hover:bg-brand-gold/10 transition-all shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-extrabold text-charcoal whitespace-nowrap">
              {MONTHS[month]}, {year}
            </h3>
            <button
              onClick={nextMonth}
              className="w-8 h-8 rounded-full bg-[#F8F6F2] flex items-center justify-center text-[#8A7E6B] hover:text-brand-gold hover:bg-brand-gold/10 transition-all shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 px-2 pt-3 pb-1">
            {DAYS_SHORT.map((day) => (
              <div key={day} className="text-center text-[11px] font-bold text-brand-gold py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 px-2 pb-3 gap-0">
            {cells.map((cell, idx) => {
              if (cell.type === 'prev' || cell.type === 'next') {
                return (
                  <div key={`${cell.type}-${idx}`} className="text-center text-sm text-[#D5CFC5] py-1.5">
                    {cell.day}
                  </div>
                );
              }
              const sel = isSelected(cell.day);
              const todayCell = isToday(cell.day);
              const disabled = isBeforeMinDate(cell.day);
              return (
                <button
                  key={`day-${cell.day}`}
                  onClick={() => !disabled && selectDate(cell.day)}
                  disabled={disabled}
                  className={`
                    text-center text-sm font-bold py-1.5 rounded-full transition-all
                    ${disabled ? 'text-[#D5CFC5] cursor-not-allowed' : ''}
                    ${sel ? 'bg-[#C4A94D] text-white shadow-md' : ''}
                    ${!sel && !disabled && todayCell ? 'text-[#C4A94D] border border-[#C4A94D]' : ''}
                    ${!sel && !disabled && !todayCell ? 'text-charcoal hover:bg-[#C4A94D]/10' : ''}
                  `}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Today */}
          <div className="border-t border-[#F0EDE4] px-4 py-2 flex justify-center">
            <button
              onClick={() => {
                const now = new Date();
                const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                onChange(dateStr);
                setIsOpen(false);
              }}
              className="text-sm font-bold text-brand-gold hover:underline"
            >
              اليوم
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
