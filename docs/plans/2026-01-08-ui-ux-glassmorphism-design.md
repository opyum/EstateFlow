# EstateFlow - Design UI/UX Glassmorphism Luxe

**Date** : 2026-01-08
**Objectif** : Améliorer l'UI/UX avec des effets modernes et un design luxueux responsive

---

## Résumé

Refonte visuelle complète d'EstateFlow avec :
- **Style** : Glassmorphism (effets verre dépoli, transparences, flous)
- **Animations** : Subtiles et élégantes (micro-interactions, transitions fluides)
- **Palette** : Tons chauds luxueux (crème, beige, or)
- **Typographie** : Serif élégante pour les titres (Cormorant Garamond)
- **Scope** : Application entière (portail client, dashboard agent, landing page)

---

## 1. Fondations Visuelles

### Palette de couleurs

#### Tons principaux
| Nom | Hex | Usage |
|-----|-----|-------|
| Crème | `#FAF8F5` | Fond principal |
| Beige | `#F5F1EB` | Cartes, surfaces secondaires |
| Charbon | `#2D2A26` | Texte principal |
| Taupe | `#6B635A` | Texte secondaire |

#### Accents luxe
| Nom | Hex | Usage |
|-----|-----|-------|
| Or | `#C9A962` | Boutons primaires, highlights |
| Or clair | `#E8D5A3` | Bordures, séparateurs |
| Vert sauge | `#7D9B76` | Statut succès |
| Ambre | `#D4A256` | Statut attention |

### Typographie

- **Titres (H1-H3)** : Cormorant Garamond (Google Fonts)
  - Weights : 400, 500, 600, italic
- **Corps et UI** : Inter (conservé)
- **Principe** : Titres plus grands, espacement généreux

### Effets Glassmorphism

```css
/* Carte glass standard */
.glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

/* Glass plus opaque (sidebar, header) */
.glass-dark {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
}
```

---

## 2. Micro-interactions & Animations

### Transitions globales
- **Durée** : 300ms
- **Easing** : `ease-out`
- **Hover cartes** : `translateY(-2px)` + ombre intensifiée
- **Hover boutons** : Luminosité + `scale(1.02)`

### Animations d'entrée
- **Type** : Fade-in + slide-up (20px)
- **Stagger** : 50ms entre éléments d'une liste
- **Trigger** : Intersection Observer à 10% du viewport

### Micro-interactions spécifiques
| Élément | Animation |
|---------|-----------|
| Timeline complétée | Pulsation dorée au chargement |
| Progress bar | Effet shimmer (brillance traversante) |
| Boutons au clic | Ripple doré subtil |
| Inputs au focus | Bordure illumination progressive |
| Badges | Léger rebond à l'apparition |

### Accessibilité
- Respect de `prefers-reduced-motion`
- Curseur standard conservé

---

## 3. Portail Client (deal/[token])

### Hero Section
- Image propriété : 70vh, parallax subtil
- Overlay : Dégradé glass du bas vers le haut
- Carte agent : Flottante en bas à gauche, fond glass, photo avec bordure dorée
- Titre : Cormorant Garamond, blanc avec ombre

### Section Progression
- Carte glass centrale sur fond beige
- Barre de progression : Dégradé doré + shimmer animé
- Pourcentage : Grand chiffre Cormorant, couleur or

### Timeline
- Ligne verticale : Dégradé doré (s'estompe vers le bas)
- Points d'étape :
  - Complété : Cercle or plein + check blanc
  - En cours : Anneau doré pulsant
  - À venir : Cercle transparent, bordure fine
- Cartes : Fond glass, fade-in staggeré
- Dates : Cormorant italique

### Footer fixe
- Barre glass (`backdrop-blur-xl`)
- Boutons pill, action principale en or

---

## 4. Dashboard Agent

### Sidebar
- Fond glass sur beige moyen
- Navigation : Icônes dorées au hover, barre active dorée à gauche
- Animation : Slide-in au chargement

### Header
- Barre glass fixe avec ombre douce
- Recherche : Bordure dorée au focus
- Avatar : Bordure dorée, dropdown glass

### Cartes statistiques
- Fond glass semi-transparent
- Icônes : Cercles fond or clair
- Chiffres : Cormorant grand, compteur animé au chargement
- Hover : Élévation + ombre

### Liste des deals
- Cartes glass avec apparition staggerée
- Photo : Coins arrondis, bordure dorée fine
- Mini progress bar dorée
- Badges : Glass coloré (sauge/ambre)
- Hover : Bordure transparente → dorée

### Formulaires
- Labels : Cormorant petites caps
- Inputs : Fond transparent, bordure dorée au focus
- Submit : Fond or, hover lumineux

---

## 5. Landing Page

### Hero
- Image/vidéo plein écran luxueuse
- Overlay glass prononcé
- Titre : Cormorant 5xl+, blanc, centré
- Sous-titre : Inter light
- CTA : Bouton or pill, effet lumineux
- Animation : Fade-in depuis le bas

### Section "Comment ça marche"
- Fond beige uni
- 3 cartes glass horizontales (colonne mobile)
- Numéros : Cormorant grand, or
- Icônes : Ligne fine, dorées
- Animation staggerée au scroll

### Témoignages
- Carrousel défilement lent
- Cartes glass avec photo, citation Cormorant italique
- Indicateurs : Points dorés

### Pricing
- Cartes glass
- Plan recommandé : Bordure dorée épaisse
- Prix : Cormorant très grand
- Checkmarks dorés

### Footer
- Fond charbon (inverse)
- Texte crème, liens dorés au hover
- Séparateur fin doré en haut

---

## 6. Implémentation Technique

### Dépendances

```json
{
  "framer-motion": "^10.x",
  "next/font": "Cormorant_Garamond"
}
```

### Variables CSS (globals.css)

```css
:root {
  /* Couleurs principales */
  --color-cream: 40 33% 97%;
  --color-beige: 35 26% 94%;
  --color-charcoal: 30 6% 16%;
  --color-taupe: 30 8% 38%;

  /* Accents */
  --color-gold: 43 45% 59%;
  --color-gold-light: 43 55% 77%;
  --color-sage: 108 15% 53%;
  --color-amber: 36 62% 58%;
}
```

### Classes utilitaires

```css
.glass { /* voir section 1 */ }
.glass-dark { /* voir section 1 */ }
.text-serif { font-family: 'Cormorant Garamond', serif; }
.animate-fade-up { /* Framer Motion */ }
.shimmer { /* animation brillance */ }
```

### Responsive
- Mobile first conservé
- Blur réduit sur mobile (performance)
- Images : `object-cover`, ratio adaptatif
- Sidebar : Drawer mobile avec overlay glass
- Cartes : Stack vertical mobile, grille desktop

### Performance
- Lazy loading images
- Intersection Observer pour animations
- `will-change` sur éléments animés
- Respect `prefers-reduced-motion`

---

## 7. Composants à créer/modifier

### Nouveaux composants

| Composant | Description |
|-----------|-------------|
| `GlassCard` | Carte glassmorphism configurable |
| `GoldButton` | Bouton doré avec hover lumineux |
| `AnimatedSection` | Wrapper fade-in au scroll |
| `ShimmerProgress` | Progress bar avec effet brillance |
| `TimelineStep` | Étape timeline redesignée |
| `StatCard` | Carte stat avec compteur animé |
| `SerifHeading` | Titre Cormorant Garamond |

### Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `globals.css` | Variables couleurs, classes utilitaires, fonts |
| `tailwind.config.ts` | Extension thème (couleurs, animations) |
| `layout.tsx` | Import Cormorant Garamond |
| `components/ui/button.tsx` | Variant "gold" |
| `components/ui/card.tsx` | Variant "glass" |
| `components/ui/badge.tsx` | Couleurs sauge, ambre |
| `app/page.tsx` | Refonte landing |
| `app/deal/[token]/page.tsx` | Refonte portail client |
| `app/dashboard/*` | Refonte sidebar, header, pages |

---

## 8. Ordre d'implémentation

1. **Fondations** : globals.css, tailwind.config, fonts
2. **Composants UI** : GlassCard, GoldButton, AnimatedSection, etc.
3. **Layout** : Sidebar glass, header glass
4. **Portail client** : Hero, timeline, footer
5. **Dashboard agent** : Stats, deals, formulaires
6. **Landing page** : Hero, sections, footer

---

## Validation

- [x] Fondations visuelles validées
- [x] Micro-interactions validées
- [x] Portail client validé
- [x] Dashboard agent validé
- [x] Landing page validée
- [x] Implémentation technique validée
- [x] Structure composants validée
