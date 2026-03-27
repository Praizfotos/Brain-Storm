'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Navbar() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const isActive = (href: string) => pathname.endsWith(href);

  return (
    <nav aria-label={t('siteNav')} className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-colors">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-gray-900 dark:text-white">
          {t('brand')}
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/courses"
            aria-current={isActive('/courses') ? 'page' : undefined}
            className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {t('courses')}
          </Link>
          <Link
            href="/profile"
            aria-current={isActive('/profile') ? 'page' : undefined}
            className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {t('profile')}
          </Link>
          <LanguageSwitcher />
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  return (
    <nav className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-colors">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-gray-900 dark:text-white">
          Brain-Storm
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/courses" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
            Courses
          </Link>
          <Link href="/profile" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
            Profile
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
