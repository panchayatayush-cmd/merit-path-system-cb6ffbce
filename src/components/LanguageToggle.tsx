import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, toggleLang } = useLanguage();

  return (
    <button
      onClick={toggleLang}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border bg-card hover:bg-secondary transition-colors ${className}`}
      title={lang === 'en' ? 'हिंदी में बदलें' : 'Switch to English'}
    >
      <Globe className="h-3.5 w-3.5" />
      {lang === 'en' ? 'हिंदी' : 'EN'}
    </button>
  );
}
