import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import {
  Stethoscope,
  Mic,
  FileText,
  ArrowRight,
  Brain,
  ShieldCheck,
  Clock,
  ChevronRight,
  Moon,
  Sun,
  Languages,
  Activity,
  Heart,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { useState, useEffect } from 'react';

/* ─── Animated Counter ─────────────────────────────────────────── */
function AnimatedCounter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.3 }
    );

    const el = document.getElementById(`counter-${end}`);
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [end, started]);

  useEffect(() => {
    if (!started) return;
    const duration = 2000;
    const steps = 60;
    const increment = end / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [started, end]);

  return (
    <span id={`counter-${end}`}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

/* ─── Landing Page ─────────────────────────────────────────────── */
export default function Landing() {
  const { t, i18n } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ro' ? 'en' : 'ro');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text-primary)' }}>
      {/* ══════════ NAVBAR ══════════ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'glass border-b' : ''
        }`}
        style={{
          borderColor: scrolled ? 'var(--color-border)' : 'transparent',
          boxShadow: scrolled ? 'var(--shadow-navbar)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div
              className="flex items-center justify-center rounded-xl p-2 transition-transform group-hover:scale-105"
              style={{ backgroundColor: 'var(--color-primary-light)' }}
            >
              <Stethoscope className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
            </div>
            <span className="text-xl font-bold tracking-tight">
              E-Health <span style={{ color: 'var(--color-primary)' }}>AI</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            <a
              href="#features"
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--color-surface-hover)]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('landing.nav_features')}
            </a>
            <a
              href="#how-it-works"
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--color-surface-hover)]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('landing.nav_how')}
            </a>
            <a
              href="#stats"
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--color-surface-hover)]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('landing.nav_about')}
            </a>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-sm font-bold transition-colors hover:bg-[var(--color-surface-hover)]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <Languages className="h-4 w-4" />
              <span className="text-xs uppercase">{i18n.language === 'ro' ? 'RO' : 'EN'}</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-lg transition-colors hover:bg-[var(--color-surface-hover)]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>

            <div className="hidden md:flex items-center gap-2 ml-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-[var(--color-surface-hover)]"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t('landing.login')}
              </Link>
              <Link
                to="/register"
                className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-primary-foreground)',
                  boxShadow: 'var(--shadow-button-primary)',
                }}
              >
                {t('landing.get_started')}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ══════════ HERO ══════════ */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-[120px] opacity-30"
            style={{ backgroundColor: 'var(--color-primary)' }}
          />
          <div
            className="absolute -bottom-20 -left-40 w-[400px] h-[400px] rounded-full blur-[100px] opacity-10"
            style={{ backgroundColor: 'var(--color-primary)' }}
          />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle, var(--color-text-primary) 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8 animate-fade-in"
              style={{
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                border: '1px solid var(--color-primary-light)',
              }}
            >
              <Activity className="h-4 w-4" />
              {t('landing.badge')}
            </div>

            {/* Heading */}
            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 animate-fade-in-up"
              style={{ animationDelay: '100ms' }}
            >
              {t('landing.hero_title_1')}{' '}
              <span className="relative inline-block">
                <span className="text-gradient">{t('landing.hero_title_highlight')}</span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 8C50 2 150 2 298 8" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
                </svg>
              </span>
              <br />
              {t('landing.hero_title_2')}
            </h1>

            {/* Subtitle */}
            <p
              className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up"
              style={{ color: 'var(--color-text-secondary)', animationDelay: '200ms' }}
            >
              {t('landing.hero_subtitle')}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <Link
                to="/register"
                className="group flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-bold transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-primary-foreground)',
                  boxShadow: 'var(--shadow-button-primary)',
                }}
              >
                {t('landing.cta_primary')}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#features"
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold border transition-all duration-200 hover:bg-[var(--color-surface-hover)]"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {t('landing.cta_secondary')}
              </a>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-6 mt-12 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              {[
                { icon: ShieldCheck, text: t('landing.trust_secure') },
                { icon: Clock, text: t('landing.trust_available') },
                { icon: Heart, text: t('landing.trust_certified') },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  <item.icon className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
                  {item.text}
                </div>
              ))}
            </div>
          </div>

          {/* Floating decorative cards */}
          <div className="hidden lg:block">
            {/* Left floating card */}
            <div
              className="absolute top-40 -left-4 card p-4 rounded-2xl animate-float max-w-[200px]"
              style={{ animationDelay: '0s' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-success-light)' }}>
                  <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-success)' }} />
                </div>
                <span className="text-xs font-bold" style={{ color: 'var(--color-success)' }}>{t('landing.float_transcribed')}</span>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                {t('landing.float_transcribed_desc')}
              </p>
            </div>

            {/* Right floating card */}
            <div
              className="absolute top-52 -right-4 card p-4 rounded-2xl animate-float max-w-[200px]"
              style={{ animationDelay: '2s' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary-light)' }}>
                  <Brain className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                </div>
                <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>{t('landing.float_ai')}</span>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                {t('landing.float_ai_desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section id="features" className="py-20 md:py-28 relative">
        <div className="max-w-7xl mx-auto px-6">
          {/* Section header */}
          <div className="text-center mb-16">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4"
              style={{
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
              }}
            >
              {t('landing.features_badge')}
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              {t('landing.features_title')}
            </h2>
            <p
              className="text-lg max-w-2xl mx-auto"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('landing.features_subtitle')}
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 stagger-children">
            {[
              {
                icon: Mic,
                title: t('landing.feature_1_title'),
                desc: t('landing.feature_1_desc'),
                gradient: 'from-red-500/10 to-orange-500/10',
              },
              {
                icon: Brain,
                title: t('landing.feature_2_title'),
                desc: t('landing.feature_2_desc'),
                gradient: 'from-red-500/10 to-pink-500/10',
              },
              {
                icon: FileText,
                title: t('landing.feature_3_title'),
                desc: t('landing.feature_3_desc'),
                gradient: 'from-red-500/10 to-rose-500/10',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group card card-lift p-8 rounded-2xl relative overflow-hidden"
              >
                {/* Hover gradient overlay */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                />

                <div className="relative">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: 'var(--color-primary-light)' }}
                  >
                    <feature.icon className="h-7 w-7" style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {feature.desc}
                  </p>

                  <div
                    className="mt-5 flex items-center gap-1 text-sm font-semibold transition-colors group-hover:gap-2"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {t('landing.learn_more')}
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section
        id="how-it-works"
        className="py-20 md:py-28"
        style={{ backgroundColor: 'var(--color-surface-elevated)' }}
      >
        <div className="max-w-7xl mx-auto px-6">
          {/* Section header */}
          <div className="text-center mb-16">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4"
              style={{
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
              }}
            >
              {t('landing.how_badge')}
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              {t('landing.how_title')}
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
              {t('landing.how_subtitle')}
            </p>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-8 relative stagger-children">
            {/* Connecting line (desktop) */}
            <div
              className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-[2px]"
              style={{ backgroundColor: 'var(--color-border)' }}
            />

            {[
              {
                step: '01',
                icon: Mic,
                title: t('landing.step_1_title'),
                desc: t('landing.step_1_desc'),
              },
              {
                step: '02',
                icon: Brain,
                title: t('landing.step_2_title'),
                desc: t('landing.step_2_desc'),
              },
              {
                step: '03',
                icon: FileText,
                title: t('landing.step_3_title'),
                desc: t('landing.step_3_desc'),
              },
            ].map((step, i) => (
              <div key={i} className="text-center relative">
                {/* Step number circle */}
                <div className="flex justify-center mb-6">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center relative z-10"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-primary-foreground)',
                      boxShadow: '0 4px 20px rgba(200, 16, 46, 0.3)',
                    }}
                  >
                    <step.icon className="h-7 w-7" />
                  </div>
                </div>

                <div
                  className="text-xs font-bold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('landing.step_label')} {step.step}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p
                  className="text-sm leading-relaxed max-w-xs mx-auto"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ STATS ══════════ */}
      <section id="stats" className="py-20 md:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div
            className="rounded-3xl p-10 md:p-16 relative overflow-hidden"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-primary-foreground)',
            }}
          >
            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[80px] bg-white/10" />
              <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full blur-[60px] bg-black/10" />
            </div>

            <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: 10000, suffix: '+', label: t('landing.stat_consultations') },
                { value: 500, suffix: '+', label: t('landing.stat_doctors') },
                { value: 99, suffix: '.9%', label: t('landing.stat_uptime') },
                { value: 15000, suffix: '+', label: t('landing.stat_patients') },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-3xl md:text-4xl font-extrabold mb-1">
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-sm font-medium opacity-80">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ CTA SECTION ══════════ */}
      <section className="py-20 md:py-28" style={{ backgroundColor: 'var(--color-surface-elevated)' }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'var(--color-primary-light)' }}
          >
            <Stethoscope className="h-8 w-8" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            {t('landing.cta_title')}
          </h2>
          <p
            className="text-lg max-w-2xl mx-auto mb-8"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('landing.cta_subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="group flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-bold transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-primary-foreground)',
                boxShadow: 'var(--shadow-button-primary)',
              }}
            >
              {t('landing.cta_register')}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold border transition-all duration-200 hover:bg-[var(--color-surface-hover)]"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              {t('landing.cta_login')}
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer
        className="border-t py-12"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="p-1.5 rounded-lg"
                  style={{ backgroundColor: 'var(--color-primary-light)' }}
                >
                  <Stethoscope className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                </div>
                <span className="text-lg font-bold">
                  E-Health <span style={{ color: 'var(--color-primary)' }}>AI</span>
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-tertiary)' }}>
                {t('landing.footer_desc')}
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-bold text-sm mb-4">{t('landing.footer_platform')}</h4>
              <ul className="space-y-2.5">
                {['features', 'security', 'pricing'].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm transition-colors hover:text-[var(--color-primary)]"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {t(`landing.footer_${item}`)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-4">{t('landing.footer_company')}</h4>
              <ul className="space-y-2.5">
                {['about', 'contact', 'careers'].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm transition-colors hover:text-[var(--color-primary)]"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {t(`landing.footer_${item}`)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-4">{t('landing.footer_legal')}</h4>
              <ul className="space-y-2.5">
                {['privacy', 'terms', 'gdpr'].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm transition-colors hover:text-[var(--color-primary)]"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {t(`landing.footer_${item}`)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              &copy; {new Date().getFullYear()} Moglan Calin-Stefan. {t('landing.footer_rights')}
            </p>
            <div className="flex items-center gap-4">
              <div
                className="flex items-center gap-1.5 text-xs font-medium"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                <ShieldCheck className="h-3.5 w-3.5" style={{ color: 'var(--color-success)' }} />
                {t('landing.footer_hipaa')}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
