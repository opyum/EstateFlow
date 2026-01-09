'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform, Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useLanguage } from '@/lib/i18n';
import { Check, ArrowRight, Sparkles, Shield, Clock, Users, FileText, Smartphone } from 'lucide-react';
import { useRef } from 'react';

const featureIcons = [Clock, Sparkles, Shield, Users, FileText, Smartphone];

export default function HomePage() {
  const { t } = useLanguage();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-cream noise-overlay">
      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between rounded-2xl bg-charcoal/90 backdrop-blur-xl px-6 py-3 shadow-2xl border border-white/5">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
                <span className="font-serif text-charcoal font-bold text-sm">E</span>
              </div>
              <span className="font-serif text-xl font-semibold text-cream">EstateFlow</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-cream/70 hover:text-cream transition-colors text-sm">
                {t.nav.features}
              </a>
              <a href="#pricing" className="text-cream/70 hover:text-cream transition-colors text-sm">
                {t.nav.pricing}
              </a>
            </div>

            <div className="flex items-center gap-4">
              <LanguageSwitcher variant="light" />
              <Link href="/auth">
                <Button variant="gold" size="sm" className="shadow-lg shadow-gold/20">
                  {t.nav.getStarted}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-charcoal/98 to-charcoal/95" />

        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              x: [0, 50, 0],
              y: [0, -30, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gold/10 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              x: [0, -30, 0],
              y: [0, 50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[150px]"
          />
        </div>

        {/* Luxury grid pattern */}
        <div className="absolute inset-0 luxury-grid opacity-30" />

        {/* Content */}
        <div className="relative max-w-5xl mx-auto px-6 pt-32 pb-20 text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Tagline */}
            <motion.div variants={itemVariants} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold-light text-sm">
                <Sparkles className="w-4 h-4" />
                {t.hero.tagline}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold text-cream mb-8 leading-[1.1] tracking-tight"
            >
              {t.hero.headline.split(' ').map((word, i, arr) => (
                <span key={i}>
                  {i === arr.length - 1 ? (
                    <span className="text-gradient-gold">{word}</span>
                  ) : (
                    word
                  )}{' '}
                </span>
              ))}
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-cream/60 mb-12 max-w-2xl mx-auto leading-relaxed"
            >
              {t.hero.subheadline}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/auth">
                <Button variant="gold" size="xl" className="shadow-2xl shadow-gold/30 group">
                  {t.hero.cta}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </motion.div>

            {/* Decorative line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1, duration: 1.5, ease: 'easeOut' }}
              className="mt-20 h-px w-32 mx-auto bg-gradient-to-r from-transparent via-gold/50 to-transparent"
            />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-cream/20 flex items-start justify-center p-2"
          >
            <motion.div className="w-1 h-2 bg-gold rounded-full" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Stats Section */}
      <section className="relative py-20 bg-beige">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {t.social.stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                className="text-center"
              >
                <p className="font-serif text-5xl md:text-6xl font-bold text-charcoal mb-2">
                  {stat.value}
                </p>
                <p className="text-taupe text-sm uppercase tracking-wider">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-cream luxury-grid">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-charcoal mb-4">
              {t.features.title}
            </h2>
            <p className="text-taupe text-lg max-w-xl mx-auto">
              {t.features.subtitle}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.features.items.map((feature, index) => {
              const Icon = featureIcons[index];
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                  <Card className="premium-card h-full bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-8">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center mb-6">
                        <Icon className="w-6 h-6 text-gold" />
                      </div>
                      <h3 className="font-serif text-xl font-semibold text-charcoal mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-taupe leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 bg-charcoal relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold/5 rounded-full blur-[150px]" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-cream mb-4">
              {t.pricing.title}
            </h2>
            <p className="text-cream/60 text-lg">
              {t.pricing.subtitle}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="h-full bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-colors">
                <CardContent className="p-10">
                  <div className="mb-8">
                    <p className="text-cream/60 text-sm uppercase tracking-wider mb-2">
                      {t.pricing.free.name}
                    </p>
                    <p className="font-serif text-5xl font-bold text-cream mb-1">
                      {t.pricing.free.price}
                    </p>
                    <p className="text-cream/40 text-sm">{t.pricing.free.period}</p>
                  </div>

                  <p className="text-cream/70 mb-8">{t.pricing.free.description}</p>

                  <ul className="space-y-4 mb-10">
                    {t.pricing.free.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-gold" />
                        </div>
                        <span className="text-cream/80">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/auth" className="block">
                    <Button variant="gold-outline" size="lg" className="w-full">
                      {t.pricing.free.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pro Plan */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="h-full bg-gradient-to-br from-charcoal via-charcoal/95 to-charcoal/90 border-2 border-gold shadow-2xl shadow-gold/20 relative overflow-hidden">
                {/* Gold accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold via-gold-light to-gold" />

                {/* Popular badge */}
                <div className="absolute top-6 right-6">
                  <span className="px-3 py-1 bg-gold text-charcoal text-xs font-semibold rounded-full">
                    {t.pricing.pro.badge}
                  </span>
                </div>

                <CardContent className="p-10">
                  <div className="mb-8">
                    <p className="text-gold text-sm uppercase tracking-wider mb-2 font-medium">
                      {t.pricing.pro.name}
                    </p>
                    <p className="font-serif text-5xl font-bold text-cream mb-1">
                      {t.pricing.pro.price}
                    </p>
                    <p className="text-cream/50 text-sm">{t.pricing.pro.period}</p>
                  </div>

                  <p className="text-cream/80 mb-8">{t.pricing.pro.description}</p>

                  <ul className="space-y-4 mb-10">
                    {t.pricing.pro.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-gold flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-charcoal" />
                        </div>
                        <span className="text-cream">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/auth" className="block">
                    <Button variant="gold" size="lg" className="w-full shadow-lg shadow-gold/30 text-base font-semibold">
                      {t.pricing.pro.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-beige relative">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-charcoal mb-6">
              {t.social.title}
            </h2>
            <p className="text-taupe text-lg mb-10 max-w-xl mx-auto">
              {t.footer.tagline}
            </p>
            <Link href="/auth">
              <Button variant="gold" size="xl" className="shadow-xl shadow-gold/20 group">
                {t.hero.cta}
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-charcoal py-16 relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
                <span className="font-serif text-charcoal font-bold">E</span>
              </div>
              <div>
                <p className="font-serif text-xl font-semibold text-cream">EstateFlow</p>
                <p className="text-cream/40 text-sm">{t.footer.tagline}</p>
              </div>
            </div>

            <div className="flex items-center gap-8 text-sm">
              <a href="#" className="text-cream/50 hover:text-cream transition-colors">
                {t.footer.links.privacy}
              </a>
              <a href="#" className="text-cream/50 hover:text-cream transition-colors">
                {t.footer.links.terms}
              </a>
              <a href="#" className="text-cream/50 hover:text-cream transition-colors">
                {t.footer.links.contact}
              </a>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/5 text-center">
            <p className="text-cream/30 text-sm">
              © {new Date().getFullYear()} EstateFlow. {t.footer.copyright}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
