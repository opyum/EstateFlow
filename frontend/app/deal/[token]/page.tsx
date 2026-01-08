'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { publicApi, PublicDeal } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SerifHeading } from '@/components/ui/serif-heading';
import { ShimmerProgress } from '@/components/ui/shimmer-progress';
import { AnimatedSection } from '@/components/ui/animated-section';
import { Check, Clock, Circle, Phone, Mail, MapPin, Download, FileText, Instagram, Linkedin } from 'lucide-react';

export default function ClientDealPage() {
  const params = useParams();
  const [deal, setDeal] = useState<PublicDeal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const accessToken = params.token as string;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (accessToken) {
      loadDeal();
    }
  }, [accessToken]);

  const loadDeal = async () => {
    try {
      const data = await publicApi.getDeal(accessToken);
      setDeal(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dossier introuvable');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <Card variant="glass" className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="font-serif text-xl font-bold text-destructive mb-2">Dossier introuvable</p>
            <p className="text-taupe">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const brandColor = deal.agent.brandColor || '#C9A962';
  const completedSteps = deal.timelineSteps.filter(s => s.status === 'Completed').length;
  const totalSteps = deal.timelineSteps.length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const toSignDocs = deal.documents.filter(d => d.category === 'ToSign');
  const refDocs = deal.documents.filter(d => d.category === 'Reference');
  const socialLinks = deal.agent.socialLinks ? JSON.parse(deal.agent.socialLinks) : {};

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-[70vh] overflow-hidden"
      >
        {deal.propertyPhotoUrl ? (
          <motion.div
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${deal.propertyPhotoUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-charcoal/80" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/40 to-transparent" />

        <div className="absolute inset-0 flex items-end">
          <div className="w-full p-8 pb-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="max-w-3xl mx-auto"
            >
              {deal.agent.logoUrl && (
                <img src={deal.agent.logoUrl} alt="Logo" className="h-12 mb-6" />
              )}
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-cream mb-3">
                Bienvenue, {deal.clientName}
              </h1>
              <p className="text-cream/80 text-lg">{deal.propertyAddress}</p>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-8 left-8 hidden lg:block"
        >
          <Card variant="glass-dark" className="p-4">
            <div className="flex items-center gap-4">
              {deal.agent.photoUrl ? (
                <img
                  src={deal.agent.photoUrl}
                  alt={deal.agent.fullName || 'Agent'}
                  className="w-14 h-14 rounded-full object-cover border-2"
                  style={{ borderColor: brandColor }}
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
                  style={{ backgroundColor: brandColor }}
                >
                  {(deal.agent.fullName || deal.agent.email).charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-serif font-semibold text-charcoal">{deal.agent.fullName || 'Votre agent'}</p>
                <p className="text-sm text-taupe">{deal.agent.email}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 -mt-16 relative z-10">
        <AnimatedSection className="lg:hidden">
          <Card variant="glass">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {deal.agent.photoUrl ? (
                  <img
                    src={deal.agent.photoUrl}
                    alt={deal.agent.fullName || 'Agent'}
                    className="w-16 h-16 rounded-full object-cover border-2"
                    style={{ borderColor: brandColor }}
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                    style={{ backgroundColor: brandColor }}
                  >
                    {(deal.agent.fullName || deal.agent.email).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-serif font-bold text-lg text-charcoal">{deal.agent.fullName || 'Votre agent'}</p>
                  <p className="text-taupe">{deal.agent.email}</p>
                </div>
                <div className="flex gap-2">
                  {socialLinks.instagram && (
                    <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="icon"><Instagram className="h-4 w-4" /></Button>
                    </a>
                  )}
                  {socialLinks.linkedin && (
                    <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="icon"><Linkedin className="h-4 w-4" /></Button>
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        {deal.welcomeMessage && (
          <AnimatedSection delay={0.1}>
            <Card variant="glass">
              <CardContent className="p-6">
                <p className="font-serif text-xl italic text-center text-charcoal">"{deal.welcomeMessage}"</p>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}

        <AnimatedSection delay={0.2}>
          <Card variant="glass">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="font-serif text-xl font-semibold text-charcoal">Progression</p>
                <p className="font-serif text-3xl font-bold" style={{ color: brandColor }}>{progress}%</p>
              </div>
              <ShimmerProgress value={progress} />
              <p className="text-sm text-taupe mt-2 text-center">{completedSteps} sur {totalSteps} etapes completees</p>
            </CardContent>
          </Card>
        </AnimatedSection>

        <AnimatedSection delay={0.3}>
          <Card variant="glass">
            <CardContent className="p-6">
              <SerifHeading as="h2" className="mb-8">Timeline</SerifHeading>
              <div className="space-y-0">
                {deal.timelineSteps.map((step, index) => {
                  const isCompleted = step.status === 'Completed';
                  const isInProgress = step.status === 'InProgress';
                  const isLast = index === deal.timelineSteps.length - 1;

                  return (
                    <motion.div
                      key={step.id}
                      className="flex gap-4"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300 ${
                            isCompleted ? 'border-transparent' : isInProgress ? 'animate-pulse-gold border-transparent' : 'border-beige bg-white'
                          }`}
                          style={{ backgroundColor: isCompleted || isInProgress ? brandColor : undefined }}
                        >
                          {isCompleted && <Check className="h-5 w-5 text-white" />}
                          {isInProgress && <Clock className="h-5 w-5 text-white" />}
                          {!isCompleted && !isInProgress && <Circle className="h-5 w-5 text-beige" />}
                        </div>
                        {!isLast && (
                          <div
                            className="w-0.5 flex-1 min-h-[40px] transition-colors"
                            style={{ background: isCompleted ? `linear-gradient(to bottom, ${brandColor}, ${brandColor}80)` : 'hsl(35, 26%, 94%)' }}
                          />
                        )}
                      </div>
                      <div className="pb-8 flex-1">
                        <p className={`font-medium ${isCompleted ? 'text-taupe' : 'text-charcoal'}`}>{step.title}</p>
                        {step.description && <p className="text-sm text-taupe mt-1">{step.description}</p>}
                        {step.dueDate && !isCompleted && (
                          <p className="font-serif text-sm italic text-taupe mt-1">
                            Prevu le: {new Date(step.dueDate).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                        {isInProgress && <Badge variant="warning" className="mt-2">En cours</Badge>}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        {deal.documents.length > 0 && (
          <AnimatedSection delay={0.4}>
            <Card variant="glass">
              <CardContent className="p-6">
                <SerifHeading as="h2" className="mb-6">Documents</SerifHeading>
                {toSignDocs.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-medium mb-3 text-amber">A signer</h3>
                    <div className="space-y-2">
                      {toSignDocs.map((doc) => (
                        <a
                          key={doc.id}
                          href={`${apiUrl}/api/public/deals/${accessToken}/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-lg bg-white/50 border border-transparent hover:border-gold/30 hover:bg-white/70 transition-all duration-300"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-taupe" />
                            <span className="text-charcoal">{doc.filename}</span>
                          </div>
                          <Download className="h-4 w-4 text-gold" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {refDocs.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3 text-charcoal">Documents de reference</h3>
                    <div className="space-y-2">
                      {refDocs.map((doc) => (
                        <a
                          key={doc.id}
                          href={`${apiUrl}/api/public/deals/${accessToken}/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-lg bg-white/50 border border-transparent hover:border-gold/30 hover:bg-white/70 transition-all duration-300"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-taupe" />
                            <span className="text-charcoal">{doc.filename}</span>
                          </div>
                          <Download className="h-4 w-4 text-gold" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </AnimatedSection>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 glass-dark border-t border-white/20 p-4">
        <div className="max-w-3xl mx-auto flex justify-center gap-3">
          {deal.agent.phone && (
            <a href={`tel:${deal.agent.phone}`}>
              <Button variant="gold"><Phone className="h-4 w-4 mr-2" />Appeler</Button>
            </a>
          )}
          <a href={`mailto:${deal.agent.email}`}>
            <Button variant="outline"><Mail className="h-4 w-4 mr-2" />Email</Button>
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deal.propertyAddress)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline"><MapPin className="h-4 w-4 mr-2" />Voir le bien</Button>
          </a>
        </div>
      </div>

      <div className="h-24" />
    </div>
  );
}
