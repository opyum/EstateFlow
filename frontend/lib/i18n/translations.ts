export type Language = 'fr' | 'en';

interface FeatureItem {
  title: string;
  description: string;
}

interface StatItem {
  value: string;
  label: string;
}

export interface Translations {
  nav: {
    features: string;
    pricing: string;
    getStarted: string;
  };
  hero: {
    tagline: string;
    headline: string;
    subheadline: string;
    cta: string;
    ctaSecondary: string;
  };
  features: {
    title: string;
    subtitle: string;
    items: FeatureItem[];
  };
  pricing: {
    title: string;
    subtitle: string;
    free: {
      name: string;
      price: string;
      period: string;
      description: string;
      features: string[];
      cta: string;
    };
    pro: {
      name: string;
      price: string;
      period: string;
      description: string;
      features: string[];
      cta: string;
      badge: string;
    };
  };
  social: {
    title: string;
    stats: StatItem[];
  };
  footer: {
    tagline: string;
    copyright: string;
    links: {
      privacy: string;
      terms: string;
      contact: string;
    };
  };
  language: {
    fr: string;
    en: string;
  };
}

export const translations: Record<Language, Translations> = {
  fr: {
    nav: {
      features: 'Fonctionnalités',
      pricing: 'Tarifs',
      getStarted: 'Commencer',
    },
    hero: {
      tagline: 'Digital Deal Room pour l\'Immobilier de Luxe',
      headline: 'L\'excellence au service de vos transactions',
      subheadline: 'Arrêtez de gérer vos millions par SMS. Offrez à vos clients l\'expérience de closing qu\'ils méritent.',
      cta: 'Commencer gratuitement',
      ctaSecondary: 'Voir la démo',
    },
    features: {
      title: 'Tout ce dont vous avez besoin',
      subtitle: 'Une suite complète d\'outils pour sublimer chaque transaction',
      items: [
        {
          title: 'Timeline interactive',
          description: 'Chaque étape de la transaction visualisée en temps réel',
        },
        {
          title: 'Branding personnalisé',
          description: 'Vos couleurs, votre logo, votre identité',
        },
        {
          title: 'Coffre-fort documents',
          description: 'Stockage sécurisé et partage contrôlé',
        },
        {
          title: 'Notifications automatiques',
          description: 'Vos clients informés à chaque avancée',
        },
        {
          title: 'Accès client simplifié',
          description: 'Un lien unique, sans mot de passe',
        },
        {
          title: 'Interface mobile-first',
          description: 'Parfait sur tous les appareils',
        },
      ],
    },
    pricing: {
      title: 'Tarification simple',
      subtitle: 'Commencez gratuitement, évoluez selon vos besoins',
      free: {
        name: 'Découverte',
        price: 'Gratuit',
        period: 'pour toujours',
        description: 'Parfait pour démarrer',
        features: [
          '1 transaction active',
          'Timeline interactive',
          'Accès client par lien',
          'Branding de base',
        ],
        cta: 'Commencer gratuitement',
      },
      pro: {
        name: 'Professionnel',
        price: '49€',
        period: 'par mois',
        description: 'Pour les agents établis',
        features: [
          'Transactions illimitées',
          'Stockage documents illimité',
          'Branding personnalisé complet',
          'Notifications email automatiques',
          'Support prioritaire',
        ],
        cta: 'Je veux le meilleur !',
        badge: 'Populaire',
      },
    },
    social: {
      title: 'Fait pour l\'excellence',
      stats: [
        { value: '50M€+', label: 'de transactions suivies' },
        { value: '98%', label: 'de satisfaction client' },
        { value: '2min', label: 'pour créer un deal' },
      ],
    },
    footer: {
      tagline: 'L\'expérience de suivi de transaction que vos clients méritent.',
      copyright: 'Tous droits réservés.',
      links: {
        privacy: 'Confidentialité',
        terms: 'Conditions',
        contact: 'Contact',
      },
    },
    language: {
      fr: 'Français',
      en: 'English',
    },
  },
  en: {
    nav: {
      features: 'Features',
      pricing: 'Pricing',
      getStarted: 'Get Started',
    },
    hero: {
      tagline: 'Digital Deal Room for Luxury Real Estate',
      headline: 'Excellence at the service of your transactions',
      subheadline: 'Stop managing millions via SMS. Give your clients the closing experience they deserve.',
      cta: 'Start for free',
      ctaSecondary: 'View demo',
    },
    features: {
      title: 'Everything you need',
      subtitle: 'A complete suite of tools to elevate every transaction',
      items: [
        {
          title: 'Interactive timeline',
          description: 'Every step of the transaction visualized in real-time',
        },
        {
          title: 'Custom branding',
          description: 'Your colors, your logo, your identity',
        },
        {
          title: 'Document vault',
          description: 'Secure storage and controlled sharing',
        },
        {
          title: 'Automatic notifications',
          description: 'Your clients informed at every milestone',
        },
        {
          title: 'Simplified client access',
          description: 'A unique link, no password required',
        },
        {
          title: 'Mobile-first interface',
          description: 'Perfect on all devices',
        },
      ],
    },
    pricing: {
      title: 'Simple pricing',
      subtitle: 'Start for free, scale as you grow',
      free: {
        name: 'Starter',
        price: 'Free',
        period: 'forever',
        description: 'Perfect to get started',
        features: [
          '1 active transaction',
          'Interactive timeline',
          'Client access via link',
          'Basic branding',
        ],
        cta: 'Start for free',
      },
      pro: {
        name: 'Professional',
        price: '$49',
        period: 'per month',
        description: 'For established agents',
        features: [
          'Unlimited transactions',
          'Unlimited document storage',
          'Full custom branding',
          'Automatic email notifications',
          'Priority support',
        ],
        cta: 'I want the best!',
        badge: 'Popular',
      },
    },
    social: {
      title: 'Built for excellence',
      stats: [
        { value: '$50M+', label: 'in tracked transactions' },
        { value: '98%', label: 'client satisfaction' },
        { value: '2min', label: 'to create a deal' },
      ],
    },
    footer: {
      tagline: 'The transaction tracking experience your clients deserve.',
      copyright: 'All rights reserved.',
      links: {
        privacy: 'Privacy',
        terms: 'Terms',
        contact: 'Contact',
      },
    },
    language: {
      fr: 'Français',
      en: 'English',
    },
  },
};
