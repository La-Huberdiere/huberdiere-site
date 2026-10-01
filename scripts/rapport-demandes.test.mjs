// node --test scripts/rapport-demandes.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { buildLeadsData } from "../src/lib/rapport-demandes.mjs"

const contact = (email, form, createdAt, attrs = {}) => ({ email, createdAt, attributes: { FORM: [form], ...attrs } })

test("seules les étiquettes posées par le formulaire du site comptent comme demandes", () => {
  // Cas réel de septembre 2026 : huit « Grands_Gites » importés le 05/09 entre
  // 9 h 55 et 10 h 04, sans message ni mail de confirmation, et une fiche « Autre »
  // saisie à la main. Le rapport en annonçait 22, le site en avait reçu 13.
  const contacts = [
    contact("a@ex.fr", "LP_Mariage", "2026-09-14T12:10:00Z"),
    contact("b@ex.fr", "Contact_Form", "2026-09-08T13:40:00Z"),
    contact("c@ex.fr", "Grands_Gites", "2026-09-05T09:55:00Z"),
    contact("d@ex.fr", "Bienvenue_Au_Chateau", "2026-09-05T09:56:00Z"),
    contact("e@ex.fr", "Autre", "2026-09-28T14:08:00Z"),
    contact("f@ex.fr", "Newsletter_Form", "2026-09-02T08:00:00Z"),
  ]
  const ld = buildLeadsData(contacts, "2026-09")
  assert.equal(ld.total, 2)
  assert.equal(ld.newsletter, 1)
  assert.deepEqual(ld.parCible.map(([c]) => c).sort(), ["Contact (autre)", "Mariage"])
})

test("le mois de la confirmation l'emporte sur la date de création du contact", () => {
  const contacts = [contact("a@ex.fr", "LP_Mariage", "2026-08-27T10:00:00Z")]
  const mois = new Map([["a@ex.fr", "2026-07"]])
  assert.equal(buildLeadsData(contacts, "2026-08", mois).total, 0)
  assert.equal(buildLeadsData(contacts, "2026-07", mois).total, 1)
})

test("adresses internes et de test écartées", () => {
  const contacts = [
    contact("alexis@morain.fr", "LP_Mariage", "2026-09-01T10:00:00Z"),
    contact("x+test@gmail.com", "LP_Mariage", "2026-09-01T10:00:00Z"),
  ]
  assert.equal(buildLeadsData(contacts, "2026-09").total, 0)
})

test("canal ChatGPT et déclaratif comptés", () => {
  const contacts = [
    contact("a@ex.fr", "LP_Stage", "2026-09-13T10:00:00Z", { UTM_SOURCE: "chatgpt.com", ATTRIBUTION: "Recherche Google" }),
    contact("b@ex.fr", "LP_Stage", "2026-09-16T10:00:00Z"),
  ]
  const ld = buildLeadsData(contacts, "2026-09")
  assert.equal(ld.chatgpt, 1)
  assert.equal(ld.identifies, 1)
  assert.equal(ld.declares, 1)
})

test("sans UTM, le canal vient du référent d'entrée, et le site lui-même n'est jamais un canal", () => {
  // Septembre 2026 : neuf demandes arrivées de Google comptées « accès direct »,
  // parce que le rapport ne lisait que UTM_SOURCE.
  const contacts = [
    contact("a@ex.fr", "LP_Mariage", "2026-09-11T10:00:00Z", { REFERRER: "https://www.google.fr/" }),
    contact("b@ex.fr", "LP_Mariage", "2026-09-14T10:00:00Z", { REFERRER: "https://www.bing.com/" }),
    contact("c@ex.fr", "LP_Stage", "2026-09-13T10:00:00Z", { REFERRER: "https://chatgpt.com/" }),
    contact("d@ex.fr", "LP_Mariage", "2026-09-29T10:00:00Z", { REFERRER: "https://www.chateaudelahuberdiere.com/en" }),
    contact("e@ex.fr", "LP_Mariage", "2026-09-29T10:00:00Z", { UTM_SOURCE: "chatgpt.com", REFERRER: "https://www.chateaudelahuberdiere.com/" }),
  ]
  const ld = buildLeadsData(contacts, "2026-09")
  const canal = Object.fromEntries(ld.parCanal)
  assert.equal(canal["Recherche Google"], 2)
  assert.equal(canal["ChatGPT"], 2)
  assert.equal(canal["Accès direct / source non identifiée"], 1)
  assert.equal(ld.identifies, 4)
})

test("demandes liées à une IA : tracées ou déclarées, chaque personne comptée une fois", () => {
  const ia = "ChatGPT, Gemini ou une autre IA"
  const contacts = [
    contact("a@ex.fr", "LP_Stage", "2026-09-13T10:00:00Z", { UTM_SOURCE: "chatgpt.com", ATTRIBUTION: ia }),
    contact("b@ex.fr", "LP_Mariage", "2026-09-29T10:00:00Z", { REFERRER: "https://www.chateaudelahuberdiere.com/", ATTRIBUTION: ia }),
    contact("c@ex.fr", "LP_Stage", "2026-09-16T10:00:00Z", { REFERRER: "https://www.google.fr/", ATTRIBUTION: ia }),
    contact("d@ex.fr", "LP_Mariage", "2026-09-20T10:00:00Z", { REFERRER: "https://perplexity.ai/" }),
    contact("e@ex.fr", "LP_Mariage", "2026-09-21T10:00:00Z", { ATTRIBUTION: "Recherche Google" }),
  ]
  const ld = buildLeadsData(contacts, "2026-09")
  assert.equal(ld.chatgpt, 1)
  assert.deepEqual(ld.ia, { total: 4, tracees: 2, declareesSeules: 2 })
})

test("un clic depuis l'appli Gmail Android n'est pas une recherche Google", () => {
  const ld = buildLeadsData([contact("a@ex.fr", "LP_Mariage", "2026-09-11T10:00:00Z", { REFERRER: "android-app://com.google.android.gm/" })], "2026-09")
  assert.equal(ld.identifies, 0)
})
