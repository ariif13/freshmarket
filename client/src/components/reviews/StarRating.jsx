import React, { useState } from 'react';
import { Star } from 'lucide-react';

/**
 * StarRating - komponen bintang reusable
 * @param {number} value - rating saat ini (0-5, boleh desimal untuk display)
 * @param {function} onChange - callback saat rating diklik (interactive)
 * @param {'sm'|'md'|'lg'|'xl'} size
 * @param {boolean} showValue - tampilkan angka di samping
 * @param {boolean} interactive - bisa diklik
 */
export default function StarRating({
  value = 0,
  onChange,
  size = 'md',
  showValue = false,
  interactive = false,
  total,
  className = ''
}) {
  const [hover, setHover] = useState(0);
  const displayValue = interactive && hover > 0 ? hover : value;

  const sizeConfig = {
    sm: { star: 'w-3 h-3', text: 'text-[10px]' },
    md: { star: 'w-4 h-4', text: 'text-xs' },
    lg: { star: 'w-5 h-5', text: 'text-sm' },
    xl: { star: 'w-8 h-8', text: 'text-base' }
  };
  const cfg = sizeConfig[size] || sizeConfig.md;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = displayValue >= n;
          const halfFilled = !filled && displayValue >= n - 0.5;
          return (
            <button
              key={n}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onChange && onChange(n)}
              onMouseEnter={() => interactive && setHover(n)}
              onMouseLeave={() => interactive && setHover(0)}
              className={`relative ${interactive ? 'cursor-pointer hover:scale-110 active:scale-95 transition-transform' : 'cursor-default'}`}
              aria-label={`${n} bintang`}
            >
              <Star
                className={`${cfg.star} ${filled ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
              />
              {halfFilled && (
                <Star
                  className={`${cfg.star} fill-amber-400 text-amber-400 absolute inset-0`}
                  style={{ clipPath: 'inset(0 50% 0 0)' }}
                />
              )}
            </button>
          );
        })}
      </div>
      {showValue && (
        <span className={`${cfg.text} font-bold text-slate-700`}>
          {value > 0 ? value.toFixed(1) : '—'}
          {total !== undefined && (
            <span className="text-slate-400 font-normal ml-1">
              ({total})
            </span>
          )}
        </span>
      )}
    </div>
  );
}
