// Libellés du formulaire de demande, dans les trois langues.
//
// Ils étaient codés en dur en français dans MariagePage.astro et ContactPage.astro :
// un visiteur anglais de /en/chateau-wedding-loire ou italien de
// /it/matrimonio-castello-loira remplissait « Prénom », « Nom », « Téléphone » et
// « Votre projet : date envisagée, nombre d'invités… ». Le formulaire est le seul
// endroit du site qui n'était pas traduit, sur des pages dont c'est l'unique but.
//
// Ces libellés ne vivent pas dans src/data/*.json : ce sont des chaînes d'interface,
// pas du contenu éditorial, et elles doivent rester alignées avec le code de
// validation. Les textes éditoriaux du bloc (titre, chapeau, libellé du bouton)
// restent, eux, éditables au CMS.

export type Lang = "fr" | "en" | "it";

export interface FormLabels {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneOptional: string;
  message: string;
  /** Aide sous le champ message, adaptée au contexte projet ou contact. */
  messageHintProject: string;
  messageHintContact: string;
  optional: string;
  selectPlaceholder: string;
  sending: string;
  errorGeneric: string;
  required: string;
  invalidEmail: string;
  /** Rassurance posée sous le bouton, au moment de l'envoi des données. */
  reassurance: string[];
  privacyLabel: string;
  errorSummary: string;
}

export const FORM_LABELS: Record<Lang, FormLabels> = {
  fr: {
    firstName: "Prénom",
    lastName: "Nom",
    email: "Email",
    phone: "Téléphone",
    phoneOptional: "Téléphone",
    message: "Votre projet",
    messageHintProject: "Date envisagée, nombre d'invités, vos envies…",
    messageHintContact: "Dates, nombre de personnes, vos envies…",
    optional: "facultatif",
    selectPlaceholder: "Choisissez une réponse",
    sending: "Envoi en cours…",
    errorGeneric:
      "Une erreur est survenue. Réessayez ou écrivez-nous à contact@chateaudelahuberdiere.com",
    required: "Ce champ est nécessaire pour vous répondre.",
    invalidEmail: "Cette adresse ne semble pas valide.",
    reassurance: ["Réponse sous 24 heures", "Sans engagement", "Vos données ne sont ni revendues ni partagées"],
    privacyLabel: "Politique de confidentialité",
    errorSummary: "Merci de compléter les champs signalés.",
  },
  en: {
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    phone: "Phone",
    phoneOptional: "Phone",
    message: "Your plans",
    messageHintProject: "Date you have in mind, number of guests, what you picture…",
    messageHintContact: "Dates, number of people, what you have in mind…",
    optional: "optional",
    selectPlaceholder: "Choose an answer",
    sending: "Sending…",
    errorGeneric:
      "Something went wrong. Please try again, or write to us at contact@chateaudelahuberdiere.com",
    required: "We need this to get back to you.",
    invalidEmail: "That address doesn't look right.",
    reassurance: ["An answer within 24 hours", "No commitment", "Your details are never sold or shared"],
    privacyLabel: "Privacy policy",
    errorSummary: "Please complete the fields marked below.",
  },
  it: {
    firstName: "Nome",
    lastName: "Cognome",
    email: "Email",
    phone: "Telefono",
    phoneOptional: "Telefono",
    message: "Il vostro progetto",
    messageHintProject: "Data prevista, numero di invitati, le vostre idee…",
    messageHintContact: "Date, numero di persone, le vostre idee…",
    optional: "facoltativo",
    selectPlaceholder: "Scegliete una risposta",
    sending: "Invio in corso…",
    errorGeneric:
      "Si è verificato un errore. Riprovate o scriveteci a contact@chateaudelahuberdiere.com",
    required: "Questo campo ci serve per rispondervi.",
    invalidEmail: "Questo indirizzo non sembra valido.",
    reassurance: ["Risposta entro 24 ore", "Senza impegno", "I vostri dati non vengono né venduti né condivisi"],
    privacyLabel: "Informativa sulla privacy",
    errorSummary: "Completate i campi segnalati.",
  },
};

export const formLabels = (lang: Lang): FormLabels => FORM_LABELS[lang] ?? FORM_LABELS.fr;
