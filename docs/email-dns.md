# Délivrabilité e-mail — SPF / DKIM / DMARC

Jokko envoie des e-mails transactionnels (notification de nouveau message,
à venir : bienvenue, reçus d'abonnement). Le corps est produit par
`renderEmail()` (`apps/api/src/modules/notifications/infrastructure/email-template.ts`) :
HTML compatible clients de messagerie + repli texte.

Pour que ces messages n'atterrissent pas en spam, le **domaine d'envoi** (celui
de `SMTP_FROM`, p. ex. `jokko.shop`) doit publier trois enregistrements DNS.
Adapter les valeurs au fournisseur SMTP retenu (SES, Postmark, Resend, Brevo…).

## 1. SPF (autorise les serveurs d'envoi)

Un seul enregistrement `TXT` sur le domaine racine, fusionné si un existe déjà :

```
jokko.shop.  TXT  "v=spf1 include:<inclusion-du-fournisseur> -all"
```

- SES : `include:amazonses.com`
- Postmark : `include:spf.mtasv.net`
- Resend : `include:_spf.resend.com`
- `-all` (échec dur) une fois la config vérifiée ; `~all` en transition.

## 2. DKIM (signature cryptographique)

Le fournisseur donne 1 à 3 CNAME (ou un TXT avec la clé publique). Exemple SES :

```
<sélecteur>._domainkey.jokko.shop.  CNAME  <sélecteur>.dkim.amazonses.com.
```

Vérifier ensuite dans la console du fournisseur que DKIM est « verified ».

## 3. DMARC (politique + rapports)

`TXT` sur `_dmarc.jokko.shop` :

```
_dmarc.jokko.shop.  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@jokko.shop; adkim=s; aspf=s; pct=100"
```

Progression recommandée :

1. `p=none` pendant 1–2 semaines, lire les rapports agrégés (`rua`).
2. `p=quarantine; pct=25` puis montée à `pct=100`.
3. `p=reject` une fois SPF + DKIM alignés à 100 % sur le trafic légitime.

## 4. Alignement

- `SMTP_FROM` doit utiliser le domaine signé DKIM et couvert par SPF
  (`Jokko <no-reply@jokko.shop>`).
- Configurer un domaine de **Return-Path** personnalisé chez le fournisseur
  (alignement SPF strict `aspf=s`).
- Publier un `MX` / adresse réelle pour `dmarc@` afin de recevoir les rapports.

## Vérification

```sh
dig +short TXT jokko.shop
dig +short TXT _dmarc.jokko.shop
dig +short CNAME <sélecteur>._domainkey.jokko.shop
```

Outils : mail-tester.com, Google Postmaster Tools, `learndmarc.com`.
