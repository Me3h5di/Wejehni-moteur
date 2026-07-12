const moteur = new MoteurRecommandation(SPECIALITES_DATA);

const form = document.getElementById("recherche");
const resultatsSection = document.getElementById("resultats");
const resultatsListe = document.getElementById("resultats-liste");
const resultatsTitre = document.getElementById("resultats-titre");
const resultatsSousTitre = document.getElementById("resultats-sous-titre");
const etatVide = document.getElementById("etat-vide");
const tplCarte = document.getElementById("tpl-carte");
const poolContainer = document.getElementById("pool-motscles");
const filtreInput = document.getElementById("filtre-mots");
const poolVideMsg = document.getElementById("pool-vide");
const selectionCount = document.getElementById("selection-count");
const selectionChips = document.getElementById("selection-chips");
const btnChercher = document.getElementById("btn-chercher");

const SEUIL_SCORE_MINIMUM = 2.0;
const motsSelectionnes = new Set();

// --- Construction du pool de mots-clés (plat, sans regroupement par domaine) ---
// Les mots restent volontairement non associés à un domaine/spécialité dans l'UI :
// seul le moteur de scoring établit ce lien, au moment de la recherche.
//
// MOTS_CLES_SIMPLES : sous-ensemble volontairement réduit et vulgarisé du dataset
// complet (203 mots -> ~100), pour qu'un bachelier reconnaisse et comprenne
// chaque mot proposé sans jargon technique. Le dataset complet (keyword_groups.js)
// reste inchangé ; seul l'affichage est filtré ici.
const MOTS_CLES_SIMPLES = new Set([
  "anatomie",
  "biologie humaine",
  "clinique",
  "diagnostic",
  "hôpital",
  "industrie pharmaceutique",
  "médecine générale",
  "santé animale",
  "sauver des vies",
  "soigner",
  "sécurité alimentaire",
  "urgence médicale",
  "élevage",
  "accouchement",
  "assister",
  "audition",
  "contact patient",
  "dévouement",
  "grossesse",
  "handicap",
  "imagerie médicale",
  "kinésithérapie",
  "langage",
  "prothèses",
  "radiologie",
  "rééducation",
  "soins infirmiers",
  "sport",
  "analyse de données",
  "applications",
  "circuits électroniques",
  "coder",
  "développement logiciel",
  "drones",
  "environnement",
  "hacking éthique",
  "intelligence artificielle",
  "machine learning",
  "machines",
  "mécanique",
  "objets connectés (IoT)",
  "production",
  "protéger les données",
  "robotique",
  "réseaux 5G",
  "réseaux électriques",
  "résoudre des problèmes logiques",
  "spatial",
  "sécurité informatique",
  "traitement de l'eau",
  "télécoms",
  "énergies renouvelables",
  "agriculture",
  "biotechnologie",
  "cultures",
  "foresterie",
  "génétique",
  "laboratoire",
  "nature",
  "écosystèmes",
  "algorithmes",
  "calcul",
  "statistique",
  "architecture",
  "bâtiment",
  "création visuelle",
  "design",
  "dessin",
  "patrimoine",
  "urbanisme",
  "argumentation",
  "conseil juridique",
  "droits humains",
  "défense",
  "justice",
  "lois",
  "communication",
  "culture",
  "enseignement",
  "interprétation",
  "langues étrangères",
  "littérature",
  "traduction",
  "voyages",
  "commerce",
  "comptabilité",
  "coopération internationale",
  "distribution",
  "douanes",
  "e-commerce",
  "entreprise",
  "finance",
  "gestion",
  "logistique internationale",
  "management",
  "marketing",
  "recrutement",
  "relation client",
  "ressources humaines",
  "vente",
  "économie",
]);

const TOUS_LES_MOTS = [...new Set(GROUPES_MOTSCLES.flatMap((g) => g.mots))]
  .filter((mot) => MOTS_CLES_SIMPLES.has(mot))
  .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));

const chipsParMot = new Map();

TOUS_LES_MOTS.forEach((mot) => {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip-mot";
  chip.textContent = mot;
  chip.addEventListener("click", () => toggleMot(mot, chip));
  poolContainer.appendChild(chip);
  chipsParMot.set(mot, chip);
});

filtreInput.addEventListener("input", () => {
  const requete = filtreInput.value.trim().toLowerCase();
  let visibles = 0;
  chipsParMot.forEach((chip, mot) => {
    const correspond = mot.toLowerCase().includes(requete);
    chip.classList.toggle("masque", !correspond);
    if (correspond) visibles += 1;
  });
  poolVideMsg.hidden = visibles > 0;
});

function toggleMot(mot, chipEl) {
  if (motsSelectionnes.has(mot)) {
    motsSelectionnes.delete(mot);
    chipEl.classList.remove("actif");
  } else {
    motsSelectionnes.add(mot);
    chipEl.classList.add("actif");
  }
  majResume();
}

function majResume() {
  selectionCount.textContent = `${motsSelectionnes.size} كلمة مختارة`;
  selectionChips.innerHTML = "";
  motsSelectionnes.forEach((mot) => {
    const chip = document.createElement("span");
    chip.className = "chip-resume";
    chip.innerHTML = `${mot} <button type="button" aria-label="إزالة ${mot}">×</button>`;
    chip.querySelector("button").addEventListener("click", () => {
      motsSelectionnes.delete(mot);
      const original = chipsParMot.get(mot);
      if (original) original.classList.remove("actif");
      majResume();
    });
    selectionChips.appendChild(chip);
  });
  btnChercher.disabled = motsSelectionnes.size === 0;
}

// --- Recherche ---
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (motsSelectionnes.size === 0) return;

  const texte = [...motsSelectionnes].join(", ");
  const bac = document.getElementById("bac").value || null;

  const resultats = moteur.recommander(texte, { serieBac: bac, topN: 6 });
  afficherResultats(resultats, [...motsSelectionnes]);
  resultatsSection.scrollIntoView({ behavior: "smooth", block: "start" });
});

function afficherResultats(resultats, motsChoisis) {
  etatVide.hidden = true;
  resultatsSection.hidden = false;
  resultatsListe.innerHTML = "";

  const meilleur = resultats.length
    ? Math.max(...resultats.map((r) => r.scoreFinal))
    : 0;

  if (!resultats.length || meilleur < SEUIL_SCORE_MINIMUM) {
    resultatsTitre.textContent = "لم نجد تطابقاً كافياً";
    resultatsSousTitre.textContent =
      "جرّب اختيار كلمات أخرى، أو أضف المزيد من الكلمات من مجالات مختلفة.";
    return;
  }

  resultatsTitre.textContent = `${resultats.length} تخصصات مقترحة لك`;
  resultatsSousTitre.textContent = `بناءً على: ${motsChoisis.join(" · ")}`;

  resultats.forEach((r) => resultatsListe.appendChild(construireCarte(r)));
}

// --- Détail des masters/spécialisations (priorité : des spécialités claires,
// pas les établissements) ---
// On part du champ déjà présent dans data.js (parcours_master_ou_specialisation)
// sans rien inventer sur la spécialité elle-même : on se contente de mieux
// structurer ce qui existe déjà, et d'ajouter une courte description pour
// chaque master/spécialisation afin qu'un bachelier comprenne ce que ça couvre.

const TYPES_FORMATION_MASTER = [
  "Résidanat",
  "Post-Graduation",
  "Masters",
  "Master",
  "Spécialisations",
  "Spécialisation",
];

function parserParcoursMaster(texte) {
  let typeFormation = null;
  let reste = texte;

  for (const mot of TYPES_FORMATION_MASTER) {
    if (texte.startsWith(mot)) {
      typeFormation = mot;
      reste = texte.slice(mot.length).trim();
      for (const liaison of ["en ", "de ", "du "]) {
        if (reste.startsWith(liaison)) {
          reste = reste.slice(liaison.length);
          break;
        }
      }
      break;
    }
  }

  const matchParentheseUnique = reste.match(/^\(([^)]+)\)$/);
  if (matchParentheseUnique) {
    return {
      typeFormation,
      items: matchParentheseUnique[1].split(",").map((x) => x.trim()),
    };
  }
  if (reste.includes(" / ")) {
    return { typeFormation, items: reste.split(" / ").map((x) => x.trim()) };
  }
  return { typeFormation, items: reste ? [reste] : [] };
}

// Deux specialités produisent des fragments ambigus une fois découpés
// ("Public", "Pénal", "Aéro") : on les renomme pour rester clair, sans
// changer les données sources.
function renommerFragmentsAmbigus(nomSpecialite, items) {
  if (nomSpecialite === "Droit") {
    return items.map((i) =>
      i === "Public" ? "Droit Public" : i === "Pénal" ? "Droit Pénal" : i,
    );
  }
  if (nomSpecialite === "Bases Aériennes / Travaux Maritimes") {
    return items.map((i) => (i === "Aéro" ? "Génie Civil Aéroportuaire" : i));
  }
  return items;
}

// Courte description (1 ligne) pour chaque master/spécialisation du dataset.
// Générées à partir du seul intitulé, dans le même esprit que les 241
// descriptions de métiers déjà présentes dans data.js — à relire par l'équipe
// avant mise en ligne, comme le reste du contenu généré.
const MASTER_DESCRIPTIONS = {
  "AS (Architectures des Systèmes)":
    "Conception de l'architecture globale des systèmes informatiques d'une entreprise.",
  Actuariat:
    "Calcul et gestion des risques financiers et d'assurance à l'aide des mathématiques et statistiques.",
  "Agro-écologie":
    "Pratiques agricoles respectueuses des écosystèmes et de la biodiversité.",
  Anesthésie:
    "Anesthésie-réanimation : prise en charge des patients avant, pendant et après une intervention chirurgicale.",
  "Anglais des Affaires":
    "Anglais appliqué au monde professionnel et aux échanges commerciaux internationaux.",
  Architecture:
    "Conception de bâtiments et d'espaces, en alliant esthétique, fonctionnalité et technique.",
  "Architecture Bioclimatique":
    "Conception de bâtiments adaptés au climat local pour réduire leur consommation d'énergie.",
  "Audiologie pédiatrique":
    "Dépistage et prise en charge des troubles auditifs chez l'enfant.",
  Audit:
    "Vérification et contrôle de la fiabilité des comptes et procédures d'une organisation.",
  "Audit SI":
    "Évaluation de la sécurité et de la performance des systèmes d'information.",
  "Audit et Forensic":
    "Analyse des incidents de sécurité informatique et investigation numérique après une attaque.",
  "Génie Civil Aéroportuaire":
    "Conception et gestion des infrastructures aéroportuaires.",
  "BI (Business Intelligence)":
    "Analyse des données d'entreprise pour éclairer les décisions stratégiques.",
  "Big Data": "Traitement et analyse de très grands volumes de données.",
  Biochimie:
    "Étude des réactions chimiques qui se déroulent au sein des organismes vivants.",
  "Biologie Moléculaire":
    "Étude du fonctionnement du vivant à l'échelle des molécules (ADN, protéines...).",
  "Biologie Médicale": "Analyses biologiques au service du diagnostic médical.",
  "CAO/FAO":
    "Conception et fabrication assistées par ordinateur pour les pièces mécaniques.",
  Cardio:
    "Cardiologie : diagnostic et traitement des maladies du cœur et des vaisseaux sanguins.",
  Chirurgie:
    "Interventions chirurgicales pour traiter ou corriger une pathologie.",
  "Chirurgie Buccale":
    "Interventions chirurgicales de la bouche, des dents et des mâchoires.",
  Clinique:
    "Pratique clinique directement au contact des patients et de leurs pathologies.",
  "Commande Numérique":
    "Pilotage automatisé de machines et systèmes par des programmes numériques.",
  Comptabilité:
    "Enregistrement et analyse des opérations financières d'une entreprise.",
  "Conduite du changement":
    "Accompagnement des équipes et organisations lors de transformations internes.",
  Cryptographie:
    "Techniques de chiffrement pour protéger la confidentialité des données.",
  "Data Analytics":
    "Analyse de données pour en extraire des tendances utiles à la décision.",
  Dessalement: "Transformation de l'eau de mer en eau potable ou utilisable.",
  Didactique:
    "Méthodes et techniques pour enseigner efficacement une discipline.",
  "Didactique du FLE":
    "Méthodes d'enseignement du français à des locuteurs non-francophones.",
  "Droit des Affaires":
    "Règles juridiques encadrant la vie et les activités des entreprises.",
  "Droit Public":
    "Organisation de l'État, des institutions et de leurs relations avec les citoyens.",
  "Droit Pénal": "Lois sur les infractions, leur poursuite et leur sanction.",
  Drones:
    "Conception, pilotage et exploitation de véhicules aériens sans pilote.",
  "E-commerce": "Vente de produits et services en ligne.",
  Foresterie: "Gestion et exploitation durable des forêts.",
  "Français sur Objectifs Spécifiques (FOS)":
    "Enseignement du français adapté à un métier ou un domaine précis.",
  "GL (Génie Logiciel)":
    "Conception et développement rigoureux de logiciels de grande envergure.",
  GPEC: "Anticipation des besoins futurs d'une entreprise en emplois et compétences.",
  "Gestion des données médicales":
    "Collecte, organisation et sécurisation des données de santé des patients.",
  "Gestion des risques nosocomiaux":
    "Prévention des infections et incidents liés aux soins en milieu hospitalier.",
  "Gouvernance SI":
    "Pilotage stratégique des systèmes d'information d'une organisation.",
  "Guidage et Navigation":
    "Systèmes permettant à un véhicule ou robot de se diriger de façon autonome.",
  "Génie Chimique":
    "Conception des procédés de transformation de la matière à l'échelle industrielle.",
  "Génie Civil Maritime":
    "Conception d'infrastructures portuaires et maritimes (ports, digues, quais).",
  "Génie Environnement":
    "Conception de solutions techniques pour protéger l'environnement.",
  Génétique: "Étude de l'hérédité et des gènes des êtres vivants.",
  "Hygiène et Contrôle des Denrées - HIDA":
    "Contrôle sanitaire des aliments d'origine animale destinés à la consommation.",
  Hyperfréquences:
    "Étude des ondes électromagnétiques à très haute fréquence, utilisées en télécoms et radar.",
  "IRM Cardiaque":
    "Imagerie par résonance magnétique appliquée à l'étude du cœur.",
  Immunologie:
    "Étude du système immunitaire et de ses réponses face aux maladies.",
  "Infrastructures de Transport":
    "Conception de routes, ponts, voies ferrées et autres réseaux de transport.",
  "Ingénierie du Logiciel":
    "Méthodes de conception, développement et maintenance de logiciels fiables.",
  "Interprétation de Conférence":
    "Traduction orale simultanée ou consécutive lors de conférences internationales.",
  "Kinésithérapie du sport":
    "Rééducation et prévention des blessures chez les sportifs.",
  Littérature:
    "Étude des œuvres littéraires, de leur style et de leur contexte historique.",
  "Logistique Internationale":
    "Organisation du transport et de la circulation des marchandises entre pays.",
  "Machine Learning":
    "Conception d'algorithmes qui apprennent à partir de données.",
  Maintenance:
    "Entretien et réparation des équipements pour assurer leur bon fonctionnement.",
  "Management Distribution":
    "Organisation et pilotage des réseaux de vente et de distribution.",
  "Management Financier":
    "Gestion des ressources financières et des investissements d'une entreprise.",
  "Management International":
    "Gestion d'entreprises ou d'équipes opérant dans plusieurs pays.",
  "Management des soins":
    "Organisation et encadrement des équipes et services de soins.",
  "Marketing Digital":
    "Promotion de produits et services via les canaux numériques.",
  "Marketing des Services":
    "Stratégies marketing adaptées aux entreprises de services.",
  Microbiologie:
    "Étude des micro-organismes (bactéries, virus, champignons...).",
  Microélectronique:
    "Conception de composants électroniques miniaturisés (puces, circuits intégrés).",
  Nanomatériaux: "Étude et conception de matériaux à l'échelle du nanomètre.",
  Nanophotoniques:
    "Étude de l'interaction entre la lumière et la matière à l'échelle nanométrique.",
  "Neuropsychologie du langage":
    "Étude des troubles du langage liés au fonctionnement du cerveau.",
  Orthodontie: "Correction du positionnement des dents et des mâchoires.",
  "Orthèses robotisées":
    "Conception de dispositifs mécaniques robotisés pour assister ou corriger un mouvement.",
  Parodontologie:
    "Traitement des maladies des gencives et des tissus de soutien de la dent.",
  "Pathologies Ruminants":
    "Diagnostic et traitement des maladies des bovins, ovins et autres ruminants.",
  "Pharmacie Galénique":
    "Conception de la forme et de la fabrication des médicaments (comprimés, sirops...).",
  "Pharmacie Industrielle":
    "Production et contrôle qualité des médicaments à l'échelle industrielle.",
  "Physique Semi-conducteurs":
    "Étude des matériaux semi-conducteurs utilisés en électronique.",
  "Processus Industriels":
    "Optimisation des étapes de production dans une usine.",
  "Production Végétale":
    "Techniques de culture pour améliorer le rendement et la qualité des plantes.",
  Productique:
    "Automatisation et optimisation des lignes de production industrielle.",
  "Prothèse dentaire":
    "Conception de dents ou d'appareils dentaires artificiels.",
  "Prothèses myoélectriques":
    "Conception de prothèses commandées par les signaux musculaires du patient.",
  "Pédagogie des sciences infirmières":
    "Formation et encadrement des futurs infirmiers.",
  Pédiatrie: "Suivi médical et traitement des maladies chez l'enfant.",
  Radiologie: "Diagnostic médical par l'image (radio, scanner, IRM...).",
  Radioprotection:
    "Protection des patients et du personnel contre les rayonnements ionisants.",
  Raffinage:
    "Transformation du pétrole brut en produits utilisables (carburants, plastiques...).",
  "Recherche Opérationnelle":
    "Utilisation de modèles mathématiques pour optimiser des décisions complexes.",
  Restauration:
    "Réhabilitation et conservation des bâtiments anciens ou historiques.",
  "Risques Bancaires":
    "Identification et gestion des risques financiers dans le secteur bancaire.",
  Robotique: "Conception et programmation de robots.",
  "Robotique Mobile":
    "Conception de robots capables de se déplacer de façon autonome.",
  "Réadaptation cognitive":
    "Accompagnement des patients pour restaurer leurs capacités mentales après un traumatisme.",
  "Réglage d'implants":
    "Ajustement précis des implants auditifs selon les besoins du patient.",
  "Réseaux Optiques":
    "Transmission de données à très haut débit via la fibre optique.",
  "Réseaux Électriques":
    "Conception et gestion des infrastructures de distribution d'électricité.",
  "Rééducation neurologique":
    "Rééducation des patients atteints de troubles du système nerveux.",
  "SI Avancés":
    "Conception de systèmes d'information complexes pour les grandes organisations.",
  "SI Globaux":
    "Intégration de systèmes d'information à l'échelle d'une organisation entière.",
  Salubrité:
    "Prévention des risques sanitaires liés à l'hygiène des lieux et des soins.",
  "Scanner haute définition":
    "Réalisation d'examens d'imagerie médicale de haute précision.",
  "Smart Grids":
    "Réseaux électriques intelligents capables de s'adapter automatiquement à la demande.",
  Statistique:
    "Collecte et analyse de données chiffrées pour en tirer des conclusions fiables.",
  "Stratégie RH":
    "Définition des orientations à long terme de la gestion des ressources humaines.",
  "Suivi de grossesses à haut risque":
    "Accompagnement médical des grossesses présentant des complications particulières.",
  "Supply Chain Numérique":
    "Gestion de la chaîne logistique à l'aide d'outils numériques.",
  "Systèmes Autonomes":
    "Conception de systèmes capables de fonctionner sans intervention humaine directe.",
  "Systèmes Cyber-Physiques":
    "Systèmes combinant capteurs, calcul informatique et actionneurs physiques.",
  "Systèmes Embarqués":
    "Conception de circuits et logiciels intégrés directement dans un appareil.",
  "Sécurité SI":
    "Protection des systèmes d'information contre les cyberattaques.",
  "Techniques d'analyses avancées":
    "Méthodes de pointe pour l'analyse d'échantillons en laboratoire.",
  Toxicologie: "Étude des effets des substances toxiques sur l'organisme.",
  "Toxicologie biologique":
    "Analyse biologique des effets de substances toxiques dans l'organisme.",
  "Traduction Technique":
    "Traduction de documents spécialisés (juridiques, scientifiques, techniques...).",
  "Traitement Eaux":
    "Purification de l'eau pour la rendre potable ou réutilisable.",
  "Traitement du signal":
    "Analyse et transformation des signaux (son, image, données) par des algorithmes.",
  Turbomachines:
    "Conception de machines tournantes (turbines, compresseurs...) utilisées dans l'industrie.",
  "Télécoms Mobiles":
    "Conception des réseaux et technologies de téléphonie mobile.",
  Urbanisme: "Planification et organisation de l'aménagement des villes.",
  "Vision par Ordinateur & NLP":
    "Analyse automatique d'images et de textes par l'intelligence artificielle.",
  "Échographie obstétricale": "Suivi de la grossesse par imagerie à ultrasons.",
  "Économie Monétaire":
    "Étude du rôle de la monnaie et des banques centrales dans l'économie.",
  Économétrie:
    "Utilisation de modèles statistiques pour analyser des données économiques.",
  "Économétrie Appliquée":
    "Application de méthodes statistiques à des problématiques économiques concrètes.",
  "Électronique de Puissance":
    "Conversion et contrôle de l'énergie électrique dans les systèmes de forte puissance.",
  Énergétique:
    "Étude de la production, du transport et de l'utilisation de l'énergie.",
  Épidémiologie: "Étude de la propagation des maladies dans une population.",
};

function construireBlocMaster(sp) {
  const { typeFormation, items: itemsBruts } = parserParcoursMaster(
    sp.parcours_master_ou_specialisation,
  );
  const items = renommerFragmentsAmbigus(sp.nom, itemsBruts);

  const bloc = document.createElement("div");
  bloc.className = "master-bloc";

  const label = document.createElement("p");
  label.className = "master-bloc__label";
  label.textContent = typeFormation
    ? `التخصص / الماستر — ${typeFormation}`
    : "التخصص / الماستر";
  bloc.appendChild(label);

  const grille = document.createElement("div");
  grille.className = "master-bloc__grille";
  items.forEach((item) => {
    const carte = document.createElement("div");
    carte.className = "master-item";
    const titre = document.createElement("p");
    titre.className = "master-item__titre";
    titre.textContent = item;
    carte.appendChild(titre);
    if (MASTER_DESCRIPTIONS[item]) {
      const desc = document.createElement("p");
      desc.className = "master-item__desc";
      desc.textContent = MASTER_DESCRIPTIONS[item];
      carte.appendChild(desc);
    }
    grille.appendChild(carte);
  });
  bloc.appendChild(grille);

  return bloc;
}

function construireCarte(r) {
  const node = tplCarte.content.cloneNode(true);
  const carte = node.querySelector(".carte");
  const sp = r.specialite;

  node.querySelector(".carte__domaine").textContent = sp.domaine;
  node.querySelector(".carte__nom").textContent = sp.nom;
  node.querySelector(".carte__score").textContent =
    `التوافق ${Math.round(r.scoreFinal)}/100`;
  node.querySelector(".carte__desc").textContent = sp.description;

  const chips = node.querySelector(".carte__chips");
  r.motsClesTrouves.slice(0, 5).forEach((m) => {
    const chip = document.createElement("span");
    chip.className = "chip chip--mot";
    chip.textContent = m;
    chips.appendChild(chip);
  });
  if (r.bacCompatible === true) {
    chips.appendChild(creerChip("✓ متوافق مع شعبتك", "chip--bac-oui"));
  } else if (r.bacCompatible === false) {
    chips.appendChild(
      creerChip("⚠ الشعبة غير مطلوبة لهذا التخصص", "chip--bac-non"),
    );
  }

  const parcours = node.querySelector(".carte__parcours");
  parcours.appendChild(
    creerEtape(
      "البكالوريا",
      sp.filieres_bac_recommandees.join(" / "),
      sp.moyenne_indicative_orientation,
    ),
  );
  parcours.appendChild(
    creerEtape(
      "النظام الجامعي",
      sp.systeme_universitaire,
      sp.duree_totale_indicative,
    ),
  );

  node.querySelector(".carte__master").appendChild(construireBlocMaster(sp));

  const metiers = node.querySelector(".carte__metiers");
  sp.debouches_metiers.forEach((m) => {
    const div = document.createElement("div");
    div.className = "metier";
    const t = document.createElement("p");
    t.className = "metier__titre";
    t.textContent = m.titre;
    const d = document.createElement("p");
    d.className = "metier__desc";
    d.textContent = m.description;
    div.appendChild(t);
    div.appendChild(d);
    metiers.appendChild(div);
  });

  node.querySelector(".carte__toggle").addEventListener("click", () => {
    carte.classList.toggle("ouvert");
  });

  return node;
}

function creerChip(texte, classe) {
  const chip = document.createElement("span");
  chip.className = `chip ${classe}`;
  chip.textContent = texte;
  return chip;
}

function creerEtape(label, valeur, sous) {
  const div = document.createElement("div");
  div.className = "etape";
  div.innerHTML = `
    <p class="etape__label">${label}</p>
    <p class="etape__valeur">${valeur}</p>
    <p class="etape__sub">${sous}</p>
  `;
  return div;
}
