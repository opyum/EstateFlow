# Workflow de Développement

---

## 1. Backend - Workflow TDD (Test-Driven Development)

### Cycle Red-Green-Refactor

- **RED** - Écrire un test qui échoue
  - Définir le comportement attendu
  - Le test doit échouer (prouve qu'il teste quelque chose)

- **GREEN** - Écrire le code minimal pour faire passer le test
  - Implémenter uniquement ce qui est nécessaire
  - Ne pas anticiper les besoins futurs

- **REFACTOR** - Améliorer le code sans changer le comportement
  - Nettoyer le code
  - Éliminer les duplications
  - Les tests doivent toujours passer

### Étapes pratiques

- [ ] Identifier la fonctionnalité à développer
- [ ] Écrire le test unitaire correspondant
- [ ] Exécuter le test → il doit échouer
- [ ] Implémenter le code minimal
- [ ] Exécuter le test → il doit passer
- [ ] Refactoriser si nécessaire
- [ ] Répéter pour la prochaine fonctionnalité

### Bonnes pratiques

- Un test = un comportement
- Tests isolés et indépendants
- Nommer les tests de manière descriptive
- Exécuter tous les tests après chaque modification
- Commiter après chaque cycle réussi

---

## 2. Frontend - Workflow de Développement

### Phase 1 : Développement de l'IHM

- [ ] Créer la structure des composants
- [ ] Implémenter le HTML/JSX statique
- [ ] Appliquer les styles CSS
- [ ] Vérifier le rendu visuel
- [ ] Tester la responsivité (mobile, tablet, desktop)

### Phase 2 : Intégration avec le Backend

- [ ] Configurer les variables d'environnement (URL API)
- [ ] Implémenter les appels API
- [ ] Tester chaque endpoint manuellement
- [ ] Vérifier les réponses dans la console
- [ ] Gérer les états de chargement
- [ ] Gérer les erreurs (timeout, 404, 500...)

### Phase 3 : Lancement et Tests

- [ ] Lancer le serveur de développement
- [ ] Vérifier que la page d'accueil charge
- [ ] Tester chaque route/URL de l'application
- [ ] Vérifier la navigation entre les pages
- [ ] Tester les formulaires et interactions
- [ ] Vérifier les données affichées

### Phase 4 : Validation finale

- [ ] Tester sur différents navigateurs
- [ ] Vérifier les performances (temps de chargement)
- [ ] Valider l'accessibilité
- [ ] Tester les cas limites (données vides, erreurs)
- [ ] Build de production et test

### Commandes utiles

```bash
# Lancer le serveur de dev
npm run dev

# Lancer les tests
npm test

# Build production
npm run build
```

---

## Résumé

| Backend (TDD) | Frontend |
|---------------|----------|
| Test d'abord | Composants d'abord |
| Code minimal | Intégration API |
| Refactor | Tests manuels |
| Cycle court | Validation multi-navigateurs |
