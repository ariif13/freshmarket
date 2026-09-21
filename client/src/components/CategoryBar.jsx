import React from 'react';
import { 
  Sparkles, 
  Leaf, 
  Apple, 
  Carrot, 
  Flame, 
  ShoppingBag, 
  Cherry, 
  Filter,
  Egg,
  Fish,
  Milk,
  Wheat,
  Package,
  Drumstick,
  Beef,
  SprayCan,
  Droplets,
  Salad,
  UtensilsCrossed,
  CookingPot
} from 'lucide-react';

const ICON_MAP = {
  Sparkles,
  Leaf,
  Apple,
  Carrot,
  Flame,
  ShoppingBag,
  Cherry,
  Egg,
  Fish,
  Milk,
  Wheat,
  Package,
  Drumstick,
  Beef,
  SprayCan,
  Droplets,
  Salad,
  UtensilsCrossed,
  CookingPot
};

export default function CategoryBar({ 
  categories, 
  selectedCategory, 
  onSelectCategory,
  onlyAvailable,
  setOnlyAvailable,
  onlyOrganic,
  setOnlyOrganic
}) {
  return (
    <div className="mb-6 space-y-3">
      {/* Category Pills Slider */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
        {categories.map((cat) => {
          const IconComponent = ICON_MAP[cat.icon] || Leaf;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all select-none border ${
                isSelected
                  ? 'bg-emerald-700 text-white border-emerald-800 shadow-md shadow-emerald-700/20 scale-[1.02]'
                  : 'bg-white text-slate-700 hover:bg-slate-100/80 border-slate-200 shadow-2xs'
              }`}
            >
              <IconComponent className={`w-4 h-4 ${isSelected ? 'text-amber-300' : 'text-emerald-600'}`} />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Secondary Quick Filter Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter Cepat:
          </span>
          <button
            onClick={() => setOnlyAvailable(!onlyAvailable)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              onlyAvailable
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            ✓ Hanya Stok Ready
          </button>
          <button
            onClick={() => setOnlyOrganic(!onlyOrganic)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              onlyOrganic
                ? 'bg-teal-100 text-teal-800 border-teal-300 font-semibold'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            🌱 Organik / Hidroponik
          </button>
        </div>
      </div>
    </div>
  );
}
