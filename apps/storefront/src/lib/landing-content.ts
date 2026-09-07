import type { AppLocale } from '@/i18n/request';

/** URL publique du tableau de bord vendeur (process de création de boutique). */
export const DASHBOARD_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3001';

export interface LandingContent {
  meta: { title: string; description: string; keywords: string[] };
  hero: {
    eyebrow: string;
    title: string;
    highlight: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    reassurance: string;
  };
  pillars: { value: string; label: string }[];
  audience: {
    sellerTab: string;
    buyerTab: string;
    seller: { title: string; intro: string; points: { title: string; body: string }[]; cta: string };
    buyer: { title: string; intro: string; points: { title: string; body: string }[]; cta: string };
  };
  how: {
    title: string;
    sellerTitle: string;
    sellerSteps: { title: string; body: string }[];
    buyerTitle: string;
    buyerSteps: { title: string; body: string }[];
  };
  featured: {
    title: string;
    subtitle: string;
    seeAll: string;
    empty: string;
    productsLabel: (n: number) => string;
  };
  faq: { title: string; items: { q: string; a: string }[] };
  finalCta: { title: string; subtitle: string; button: string; secondary: string };
}

const fr: LandingContent = {
  meta: {
    title: 'Jokko — Créez votre boutique en ligne et vendez sur WhatsApp',
    description:
      "Ouvrez une vraie boutique en ligne en 2 minutes, sans code ni carte bancaire. Un seul lien à partager, des paiements encaissés, stock et commandes gérés. Pour les acheteurs : comparez les vendeurs et achetez au meilleur rapport qualité-prix, en confiance.",
    keywords: [
      'boutique en ligne',
      'vendre sur WhatsApp',
      'créer une boutique en ligne',
      'e-commerce Afrique',
      'vendre en ligne Cameroun',
      'vendre en ligne Sénégal',
      'catalogue produit en ligne',
      'paiement mobile',
      'place de marché',
      'Jokko',
    ],
  },
  hero: {
    eyebrow: 'La boutique en ligne des vendeurs indépendants',
    title: 'Transformez votre activité en',
    highlight: 'boutique en ligne',
    subtitle:
      "Jokko donne à chaque vendeur une vraie vitrine web, un lien unique à partager partout, et les outils pour encaisser, livrer et fidéliser. Aux acheteurs, une place de marché pour comparer et acheter malin.",
    ctaPrimary: 'Créer ma boutique — gratuit',
    ctaSecondary: 'Explorer les boutiques',
    reassurance: 'Sans code · Sans carte bancaire · Votre lien prêt en 2 minutes',
  },
  pillars: [
    { value: '2 min', label: 'pour ouvrir votre boutique' },
    { value: '1 lien', label: 'à partager sur WhatsApp, Facebook, Instagram, TikTok' },
    { value: '0 F', label: 'pour commencer à vendre' },
    { value: '24/7', label: 'votre boutique reste ouverte' },
  ],
  audience: {
    sellerTab: 'Je vends',
    buyerTab: "J'achète",
    seller: {
      title: 'Faites grandir votre commerce',
      intro:
        "Arrêtez de renvoyer vos clients vers des captures d'écran et des messages éparpillés. Donnez-leur une boutique claire, crédible et toujours à jour.",
      points: [
        {
          title: 'Une vitrine crédible en quelques minutes',
          body: "Nom, couleurs de marque, catégories, phrase d'accroche : votre boutique ressemble à une vraie marque, pas à un catalogue improvisé.",
        },
        {
          title: 'Un seul lien, partout',
          body: "votreboutique.scoliaa.com se colle dans une page Facebook, une bio Instagram, un statut WhatsApp ou une publicité — et renvoie toujours vers vos produits à jour.",
        },
        {
          title: 'Paiement et commandes intégrés',
          body: "Le client commande et paie depuis la fiche produit. Vous suivez chaque commande, du panier à la livraison.",
        },
        {
          title: 'Stock et prix maîtrisés',
          body: "Marquez les ruptures, affichez un prix barré pour vos promos, importez tout votre catalogue depuis un fichier ou une URL.",
        },
        {
          title: 'Vos clients reviennent',
          body: "Messagerie intégrée, avis clients, bouton WhatsApp : vous gardez le contact et bâtissez votre réputation.",
        },
        {
          title: "Vous n'êtes pas seul·e",
          body: "Invitez vos vendeurs ou votre famille avec des rôles adaptés, et suivez vos ventes dans des statistiques claires.",
        },
      ],
      cta: 'Créer ma boutique maintenant',
    },
    buyer: {
      title: 'Achetez mieux, dépensez moins',
      intro:
        "Jokko rassemble des vendeurs indépendants au même endroit. Comparez, vérifiez, et achetez au juste prix — sans quitter votre téléphone.",
      points: [
        {
          title: 'Comparez le rapport qualité-prix',
          body: "Parcourez plusieurs boutiques d'une même catégorie et comparez prix, photos et disponibilité avant de décider.",
        },
        {
          title: 'Des fiches produits honnêtes',
          body: "Prix affiché clairement, stock réel, plusieurs photos avec zoom : vous savez ce que vous achetez.",
        },
        {
          title: 'Achetez en confiance',
          body: "Avis clients, bouton de signalement et vendeurs identifiés : les mauvaises surprises sont écartées.",
        },
        {
          title: 'Parlez au vendeur directement',
          body: "Une question sur une taille, une livraison ? Contactez la boutique par WhatsApp ou messagerie en un tap.",
        },
        {
          title: 'Paiement simple et suivi',
          body: "Payez depuis la fiche produit et suivez votre commande grâce à un lien de suivi conservé sur votre téléphone.",
        },
        {
          title: 'Soutenez les commerces près de chez vous',
          body: "Derrière chaque boutique, un vendeur indépendant de votre ville ou de votre région.",
        },
      ],
      cta: 'Explorer les boutiques',
    },
  },
  how: {
    title: 'Comment ça marche',
    sellerTitle: 'Côté vendeur',
    sellerSteps: [
      {
        title: 'Créez votre compte',
        body: "E-mail ou numéro de téléphone, puis le nom et le WhatsApp de votre boutique.",
      },
      {
        title: 'Ajoutez vos produits',
        body: "Photos, prix, stock, description. Publiez en un clic — vos produits apparaissent aussitôt.",
      },
      {
        title: 'Partagez votre lien',
        body: "Diffusez votreboutique.scoliaa.com et recevez vos premières commandes.",
      },
    ],
    buyerTitle: 'Côté acheteur',
    buyerSteps: [
      {
        title: 'Trouvez une boutique',
        body: "Depuis l'annuaire Jokko ou le lien partagé par un vendeur.",
      },
      {
        title: 'Choisissez en confiance',
        body: "Comparez, lisez les avis, posez vos questions au vendeur.",
      },
      {
        title: 'Commandez et suivez',
        body: "Payez depuis la fiche produit et suivez votre commande jusqu'à la livraison.",
      },
    ],
  },
  featured: {
    title: 'Des boutiques déjà en ligne',
    subtitle: "Un aperçu des commerces qui vendent aujourd'hui sur Jokko.",
    seeAll: 'Voir toutes les boutiques',
    empty: "Les premières boutiques arrivent bientôt. La vôtre pourrait être la première.",
    productsLabel: (n) => `${n} produit${n > 1 ? 's' : ''}`,
  },
  faq: {
    title: 'Questions fréquentes',
    items: [
      {
        q: 'Combien coûte Jokko ?',
        a: "Créer votre boutique et publier vos produits est gratuit. Un abonnement vendeur, avec période d'essai, débloque les fonctions avancées. Les acheteurs ne paient rien pour utiliser Jokko.",
      },
      {
        q: 'Ai-je besoin de connaissances techniques ?',
        a: "Non. Si vous savez publier une photo sur les réseaux, vous savez tenir une boutique Jokko.",
      },
      {
        q: 'Comment mes clients me paient-ils ?',
        a: "Le client paie directement depuis la fiche produit via la passerelle de paiement intégrée. Vous suivez chaque commande dans votre tableau de bord.",
      },
      {
        q: 'Puis-je utiliser mon propre nom de domaine ?',
        a: "Oui. Chaque boutique reçoit une adresse en votreboutique.scoliaa.com, et vous pouvez brancher votre propre domaine une fois vérifié.",
      },
      {
        q: 'Est-ce que ça marche sur téléphone ?',
        a: "Entièrement. La boutique et le tableau de bord sont pensés pour le mobile d'abord et s'installent comme une application.",
      },
      {
        q: 'Comment les acheteurs me font-ils confiance ?',
        a: "Vitrine soignée, avis clients, messagerie et bouton WhatsApp : les acheteurs voient un vrai commerce, pas un compte anonyme.",
      },
      {
        q: 'Puis-je gérer la boutique à plusieurs ?',
        a: "Oui, invitez des membres avec des rôles : administrateur, vendeur ou lecture seule.",
      },
      {
        q: "Mes données m'appartiennent-elles ?",
        a: "Oui. Vous pouvez exporter vos données et supprimer votre compte à tout moment depuis votre espace.",
      },
    ],
  },
  finalCta: {
    title: 'Votre boutique en ligne vous attend',
    subtitle:
      "Rejoignez les vendeurs qui transforment leurs abonnés en clients. Ouverture en 2 minutes, sans engagement.",
    button: 'Créer ma boutique gratuitement',
    secondary: 'ou explorer les boutiques',
  },
};

const en: LandingContent = {
  meta: {
    title: 'Jokko — Build your online shop and sell on WhatsApp',
    description:
      'Open a real online shop in 2 minutes, no code and no credit card. One link to share, payments collected, stock and orders handled. For buyers: compare sellers and buy at the best value, with confidence.',
    keywords: [
      'online shop',
      'sell on WhatsApp',
      'create an online store',
      'e-commerce Africa',
      'sell online',
      'product catalogue',
      'mobile payment',
      'marketplace',
      'Jokko',
    ],
  },
  hero: {
    eyebrow: 'The online shop for independent sellers',
    title: 'Turn your business into an',
    highlight: 'online shop',
    subtitle:
      'Jokko gives every seller a real web storefront, one link to share everywhere, and the tools to get paid, deliver and retain customers. For buyers, a marketplace to compare and shop smart.',
    ctaPrimary: 'Create my shop — free',
    ctaSecondary: 'Browse shops',
    reassurance: 'No code · No credit card · Your link ready in 2 minutes',
  },
  pillars: [
    { value: '2 min', label: 'to open your shop' },
    { value: '1 link', label: 'to share on WhatsApp, Facebook, Instagram, TikTok' },
    { value: 'Free', label: 'to start selling' },
    { value: '24/7', label: 'your shop stays open' },
  ],
  audience: {
    sellerTab: 'I sell',
    buyerTab: 'I buy',
    seller: {
      title: 'Grow your business',
      intro:
        'Stop sending customers to scattered screenshots and DMs. Give them a clear, credible shop that is always up to date.',
      points: [
        {
          title: 'A credible storefront in minutes',
          body: 'Name, brand colours, categories, tagline: your shop looks like a real brand, not an improvised list.',
        },
        {
          title: 'One link, everywhere',
          body: 'yourshop.scoliaa.com fits on a Facebook page, an Instagram bio, a WhatsApp status or an ad — always pointing to your up-to-date products.',
        },
        {
          title: 'Payments and orders built in',
          body: 'Customers order and pay from the product page. You track every order from cart to delivery.',
        },
        {
          title: 'Stock and pricing under control',
          body: 'Flag out-of-stock items, show a struck-through price for sales, import your whole catalogue from a file or a URL.',
        },
        {
          title: 'Customers come back',
          body: 'Built-in messaging, customer reviews, WhatsApp button: you keep in touch and build your reputation.',
        },
        {
          title: 'You are not alone',
          body: 'Invite your staff or family with the right roles, and track sales with clear analytics.',
        },
      ],
      cta: 'Create my shop now',
    },
    buyer: {
      title: 'Buy better, spend less',
      intro:
        'Jokko brings independent sellers together in one place. Compare, check, and buy at the right price — without leaving your phone.',
      points: [
        {
          title: 'Compare value for money',
          body: 'Browse several shops in the same category and compare price, photos and availability before deciding.',
        },
        {
          title: 'Honest product pages',
          body: 'Clear pricing, real stock, multiple photos with zoom: you know what you are buying.',
        },
        {
          title: 'Buy with confidence',
          body: 'Customer reviews, a report button and identified sellers keep bad surprises away.',
        },
        {
          title: 'Talk to the seller directly',
          body: 'A question about a size or a delivery? Message the shop on WhatsApp or in-app in one tap.',
        },
        {
          title: 'Simple payment and tracking',
          body: 'Pay from the product page and follow your order with a tracking link kept on your phone.',
        },
        {
          title: 'Support businesses near you',
          body: 'Behind every shop is an independent seller from your city or region.',
        },
      ],
      cta: 'Browse shops',
    },
  },
  how: {
    title: 'How it works',
    sellerTitle: 'For sellers',
    sellerSteps: [
      { title: 'Create your account', body: 'Email or phone number, then your shop name and WhatsApp.' },
      {
        title: 'Add your products',
        body: 'Photos, price, stock, description. Publish in one click — products appear immediately.',
      },
      { title: 'Share your link', body: 'Spread yourshop.scoliaa.com and receive your first orders.' },
    ],
    buyerTitle: 'For buyers',
    buyerSteps: [
      { title: 'Find a shop', body: 'From the Jokko directory or a link shared by a seller.' },
      { title: 'Choose with confidence', body: 'Compare, read reviews, ask the seller questions.' },
      { title: 'Order and track', body: 'Pay from the product page and follow your order to delivery.' },
    ],
  },
  featured: {
    title: 'Shops already online',
    subtitle: 'A glimpse of the businesses selling on Jokko today.',
    seeAll: 'See all shops',
    empty: 'The first shops are coming soon. Yours could be the first.',
    productsLabel: (n) => `${n} product${n > 1 ? 's' : ''}`,
  },
  faq: {
    title: 'Frequently asked questions',
    items: [
      {
        q: 'How much does Jokko cost?',
        a: 'Creating your shop and publishing products is free. A seller subscription, with a trial, unlocks advanced features. Buyers pay nothing to use Jokko.',
      },
      {
        q: 'Do I need technical skills?',
        a: 'No. If you can post a photo on social media, you can run a Jokko shop.',
      },
      {
        q: 'How do customers pay me?',
        a: 'Customers pay directly from the product page through the built-in payment gateway. You track every order in your dashboard.',
      },
      {
        q: 'Can I use my own domain name?',
        a: 'Yes. Every shop gets a yourshop.scoliaa.com address, and you can connect your own domain once verified.',
      },
      {
        q: 'Does it work on phones?',
        a: 'Fully. The shop and the dashboard are mobile-first and install like an app.',
      },
      {
        q: 'How do buyers trust me?',
        a: 'A polished storefront, customer reviews, messaging and a WhatsApp button: buyers see a real business, not an anonymous account.',
      },
      {
        q: 'Can several people manage the shop?',
        a: 'Yes, invite members with roles: admin, staff or read-only.',
      },
      {
        q: 'Do I own my data?',
        a: 'Yes. You can export your data and delete your account at any time from your account area.',
      },
    ],
  },
  finalCta: {
    title: 'Your online shop is waiting',
    subtitle:
      'Join the sellers turning followers into customers. Opens in 2 minutes, no commitment.',
    button: 'Create my shop for free',
    secondary: 'or browse shops',
  },
};

export function landingContent(locale: AppLocale): LandingContent {
  return locale === 'en' ? en : fr;
}
