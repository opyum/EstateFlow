'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SerifHeading } from '@/components/ui/serif-heading';
import { AnimatedSection } from '@/components/ui/animated-section';
import { Check, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const features = [
    'Timeline interactive pour chaque transaction',
    'Branding personnalise a vos couleurs',
    'Coffre-fort documents securise',
    'Notifications email automatiques',
    'Acces client via lien unique',
    'Interface mobile-first',
  ];

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-charcoal/95 to-charcoal/90" />

        {/* Glass overlay pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-72 h-72 bg-gold/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-serif text-5xl md:text-7xl font-bold text-cream mb-6">
              EstateFlow
            </h1>
            <p className="text-xl md:text-2xl text-gold-light mb-4">
              Digital Deal Room pour l'Immobilier de Luxe
            </p>
            <p className="text-lg text-cream/70 mb-10 max-w-2xl mx-auto">
              Arretez de gerer vos millions par SMS. Offrez a vos clients l'experience de closing qu'ils meritent.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <Link href="/auth">
                <Button variant="gold" size="xl">
                  Commencer gratuitement
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-beige">
        <div className="max-w-6xl mx-auto px-4">
          <AnimatedSection>
            <SerifHeading as="h2" className="text-center mb-16">
              Tout ce dont vous avez besoin
            </SerifHeading>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card variant="glass" className="h-full">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="bg-gold/10 p-2 rounded-full shrink-0">
                      <Check className="h-4 w-4 text-gold" />
                    </div>
                    <p className="font-medium text-charcoal">{feature}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-cream">
        <div className="max-w-xl mx-auto px-4 text-center">
          <AnimatedSection>
            <SerifHeading as="h2" className="mb-4">
              Prix simple
            </SerifHeading>
            <p className="text-taupe mb-12">
              Un seul forfait, toutes les fonctionnalites
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <Card variant="glass" className="border-2 border-gold/30">
              <CardContent className="p-10">
                <p className="font-serif text-6xl font-bold text-charcoal mb-2">49 EUR</p>
                <p className="text-taupe mb-8">par mois</p>
                <ul className="text-left space-y-4 mb-10">
                  {[
                    'Transactions illimitees',
                    'Stockage documents illimite',
                    'Branding personnalise',
                    'Support prioritaire',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <div className="bg-gold/10 p-1 rounded-full">
                        <Check className="h-4 w-4 text-gold" />
                      </div>
                      <span className="text-charcoal">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/auth">
                  <Button variant="gold" size="xl" className="w-full">
                    Demarrer l'essai gratuit
                  </Button>
                </Link>
                <p className="text-sm text-taupe mt-4">
                  14 jours d'essai gratuit. Sans engagement.
                </p>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-charcoal py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="w-16 h-px bg-gold mx-auto mb-8" />
          <p className="font-serif text-2xl text-cream mb-2">EstateFlow</p>
          <p className="text-cream/60 text-sm">
            L'experience de suivi de transaction que vos clients meritent.
          </p>
          <p className="text-cream/40 text-sm mt-6">
            © {new Date().getFullYear()} EstateFlow. Tous droits reserves.
          </p>
        </div>
      </footer>
    </div>
  );
}
