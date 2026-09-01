/**
 * Contenu légal partagé (vitrine + dashboard). Données structurées, sans JSX,
 * pour rester dans un paquet TS pur.
 *
 * Identité de l'éditeur regroupée dans les constantes ci-dessous : les ajuster
 * en cas de changement (raison sociale, siège, immatriculation, direction).
 */

export interface LegalSection {
  heading?: string;
  paragraphs: string[];
}

export type LegalSlug = 'mentions-legales' | 'confidentialite' | 'cgu';

export interface LegalDocument {
  slug: LegalSlug;
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
}

export const LEGAL_UPDATED = '2026-09-01';

const OPERATOR = 'Jokko SARL';
const OPERATOR_FORM = 'société à responsabilité limitée (SARL) de droit camerounais';
const OPERATOR_ADDRESS = 'Bonabéri, Douala, Cameroun';
const OPERATOR_REG = 'immatriculée sous le numéro M062416873293M (RCCM / identifiant unique)';
const PUBLICATION_DIRECTOR = 'Faris Kouetessa';
const CONTACT_EMAIL = 'farisbrandone0@gmail.com';
const PRIVACY_EMAIL = 'farisbrandone0@gmail.com';
const HOST =
  'OVH SAS — 2 rue Kellermann, 59100 Roubaix, France — www.ovhcloud.com. ' +
  'La distribution des contenus statiques et la protection réseau sont assurées par un prestataire de CDN.';
const APPLICABLE_LAW =
  'Les présentes conditions sont régies par le droit camerounais et, le cas échéant, ' +
  'par les Actes uniformes de l’OHADA. À défaut de résolution amiable, tout litige ' +
  'relève de la compétence des tribunaux de Douala.';

export const LEGAL_DOCUMENTS: Record<LegalSlug, LegalDocument> = {
  'mentions-legales': {
    slug: 'mentions-legales',
    title: 'Mentions légales',
    updated: LEGAL_UPDATED,
    sections: [
      {
        heading: 'Éditeur',
        paragraphs: [
          `Le service Jokko est édité par ${OPERATOR}, ${OPERATOR_FORM}, dont le siège est situé à ${OPERATOR_ADDRESS}, ${OPERATOR_REG}.`,
          `Directeur de la publication : ${PUBLICATION_DIRECTOR}. Contact : ${CONTACT_EMAIL}.`,
        ],
      },
      {
        heading: 'Hébergement',
        paragraphs: [`Le service est hébergé par ${HOST}`],
      },
      {
        heading: 'Boutiques',
        paragraphs: [
          'Chaque boutique accessible via un sous-domaine ou un domaine personnalisé est éditée et gérée par un vendeur indépendant, seul responsable de ses contenus, de ses prix, de la description et de la conformité légale de ses produits, ainsi que de la relation avec ses acheteurs.',
          'Jokko fournit uniquement l’outil technique de création et de diffusion de la boutique. Jokko n’est pas partie aux transactions conclues entre un vendeur et un acheteur.',
        ],
      },
      {
        heading: 'Propriété intellectuelle',
        paragraphs: [
          'La marque, le logo et le code de la plateforme Jokko sont protégés. Les visuels, textes et marques des produits appartiennent à leurs vendeurs ou ayants droit respectifs.',
        ],
      },
      {
        heading: 'Signalement de contenu',
        paragraphs: [
          `Tout contenu illicite peut être signalé depuis la fiche produit (bouton « Signaler ») ou à l’adresse ${CONTACT_EMAIL}.`,
        ],
      },
      {
        heading: 'Droit applicable',
        paragraphs: [APPLICABLE_LAW],
      },
    ],
  },

  confidentialite: {
    slug: 'confidentialite',
    title: 'Politique de confidentialité',
    updated: LEGAL_UPDATED,
    intro:
      'Cette politique décrit les données personnelles traitées par Jokko, les raisons de ces traitements et les droits dont vous disposez.',
    sections: [
      {
        heading: 'Responsable de traitement',
        paragraphs: [
          `${OPERATOR} (${OPERATOR_ADDRESS}) pour la plateforme. Pour les données saisies au sein d’une boutique (messages, coordonnées communiquées au vendeur), le vendeur de cette boutique est responsable pour la relation commerciale. Contact : ${PRIVACY_EMAIL}.`,
        ],
      },
      {
        heading: 'Données collectées',
        paragraphs: [
          'Acheteur : nom et numéro de téléphone communiqués pour contacter une boutique, e-mail si vous le fournissez, contenu des messages échangés, et événements d’usage techniques (pages vues, recherches) rattachés à un identifiant de session non nominatif.',
          'Vendeur : adresse e-mail ou numéro de téléphone, nom, mot de passe (haché), boutiques et rôles, sessions actives, abonnements de notification push, informations d’abonnement et de paiement transmises par le prestataire de paiement.',
        ],
      },
      {
        heading: 'Finalités et bases légales',
        paragraphs: [
          'Fournir le service et mettre en relation acheteur et vendeur (exécution du contrat / mesures précontractuelles).',
          'Sécurité, prévention des abus et limitation de débit (intérêt légitime).',
          'Statistiques d’audience agrégées par boutique (intérêt légitime ; pas de profilage publicitaire).',
          'Facturation des abonnements vendeurs (obligation légale et exécution du contrat).',
        ],
      },
      {
        heading: 'Destinataires',
        paragraphs: [
          'Le vendeur de la boutique que vous contactez reçoit votre message et vos coordonnées.',
          'Sous-traitants techniques : hébergeur, service d’envoi d’e-mails et de SMS, moteur de recherche, prestataire de paiement, service de notifications push. Ils n’agissent que sur instruction de Jokko.',
        ],
      },
      {
        heading: 'Durées de conservation',
        paragraphs: [
          'Une purge automatique quotidienne supprime : les codes de connexion à usage unique expirés, les sessions révoquées ou expirées au-delà de 30 jours, les événements d’audience au-delà de 400 jours, les journaux de notification au-delà de 90 jours, et les conversations closes au-delà de 365 jours. Ces durées sont configurables par l’exploitant.',
          'Le compte vendeur et ses données sont conservés tant que le compte est actif, puis supprimés sur demande.',
        ],
      },
      {
        heading: 'Vos droits',
        paragraphs: [
          'Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité.',
          'Vendeurs : la page « Mon compte » du tableau de bord permet d’exporter l’ensemble de vos données (archive JSON) et de supprimer votre compte.',
          `Acheteurs : adressez votre demande au vendeur concerné ou à ${PRIVACY_EMAIL}. Vous pouvez aussi saisir l’autorité de protection des données compétente.`,
        ],
      },
      {
        heading: 'Cookies',
        paragraphs: [
          'Jokko n’utilise que des cookies strictement nécessaires : cookie de session (connexion sécurisée) et, côté navigateur, un stockage local pour vos préférences d’affichage. Aucun cookie publicitaire ni traceur tiers.',
        ],
      },
      {
        heading: 'Localisation et transferts des données',
        paragraphs: [
          'Les données sont hébergées chez OVH, dans des centres de données situés en Union européenne. Certains sous-traitants (envoi d’e-mails / SMS, paiement) peuvent traiter des données depuis d’autres pays ; dans ce cas, Jokko s’assure de garanties contractuelles appropriées.',
          'Aucune donnée n’est vendue ni cédée à des fins publicitaires.',
        ],
      },
    ],
  },

  cgu: {
    slug: 'cgu',
    title: 'Conditions générales d’utilisation',
    updated: LEGAL_UPDATED,
    intro:
      'Ces conditions régissent l’utilisation de Jokko par les vendeurs et par les visiteurs des boutiques.',
    sections: [
      {
        heading: 'Objet',
        paragraphs: [
          'Jokko est un outil permettant à un vendeur de créer une boutique en ligne, d’y publier des produits, de la partager sur les réseaux sociaux et d’échanger avec des acheteurs. Jokko n’encaisse pas les paiements des commandes et n’est pas partie aux ventes.',
        ],
      },
      {
        heading: 'Compte vendeur',
        paragraphs: [
          'La création d’un compte requiert une adresse e-mail ou un numéro de téléphone valide. Le vendeur est responsable de la confidentialité de ses identifiants et de toute activité réalisée depuis son compte.',
        ],
      },
      {
        heading: 'Obligations du vendeur',
        paragraphs: [
          'Le vendeur s’engage à ne proposer que des produits licites, à décrire fidèlement ses articles et ses prix, à respecter le droit de la consommation applicable et à traiter loyalement ses acheteurs.',
          'Sont notamment interdits : la contrefaçon, les produits dangereux ou réglementés sans autorisation, les contenus trompeurs, offensants ou portant atteinte aux droits de tiers.',
        ],
      },
      {
        heading: 'Rôle de Jokko',
        paragraphs: [
          'Jokko agit en qualité de prestataire technique et d’hébergeur. Jokko peut, sur signalement ou de sa propre initiative, retirer un contenu manifestement illicite, suspendre une boutique ou clôturer une conversation.',
        ],
      },
      {
        heading: 'Abonnement',
        paragraphs: [
          'L’accès vendeur débute par une période d’essai gratuite, puis se poursuit via un abonnement payant mensuel. À défaut de paiement à l’échéance, et après une courte période de grâce, la boutique est suspendue jusqu’à régularisation. Les montants et durées en vigueur sont indiqués dans le tableau de bord.',
        ],
      },
      {
        heading: 'Résiliation',
        paragraphs: [
          'Le vendeur peut fermer son compte à tout moment depuis la page « Mon compte ». Jokko peut résilier un compte en cas de manquement grave ou répété aux présentes conditions.',
        ],
      },
      {
        heading: 'Responsabilité',
        paragraphs: [
          'Le service est fourni « en l’état ». Jokko ne garantit pas l’absence d’interruption et n’est pas responsable des contenus publiés par les vendeurs ni des litiges entre acheteurs et vendeurs.',
        ],
      },
      {
        heading: 'Droit applicable',
        paragraphs: [APPLICABLE_LAW],
      },
    ],
  },
};

export const LEGAL_SLUGS = Object.keys(LEGAL_DOCUMENTS) as LegalSlug[];
