import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================================================
   FIREBASE CONFIGURATION
========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyAabgy28ZNKgdrJtS95JDjWtpo21G5zgag",
  authDomain: "aerium-design.firebaseapp.com",
  databaseURL: "https://aerium-design-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "aerium-design",
  storageBucket: "aerium-design.firebasestorage.app",
  messagingSenderId: "826137091136",
  appId: "1:826137091136:web:d6b01e0b761b2fd67a93a5",
  measurementId: "G-CW98PGD6RQ"
};

const ADMIN_UID = "lZT1OcyUB3UkYGAK6C9vAKHKKD23";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* =========================================================
   GLOBAL STATE
========================================================= */

let currentUser = null;
let currentUsername = "";
let isAdmin = false;
let authMode = "login";
let currentLanguage = localStorage.getItem("aeriumLanguage") || "en";
let unsubscribeOrders = null;
let unsubscribeAdminOrders = null;
const chatListeners = new Map();

const $ = (id) => document.getElementById(id);

const translations = {
  en: {
    navHome:"Home", navServices:"Services", navOrders:"My orders", navAdmin:"Admin",
    login:"Sign in", register:"Create account", heroEyebrow:"Independent creative studio",
    heroTitle:'Make your<br><span class="gradient-text">visual identity</span><br>unforgettable.',
    heroText:"We create bold visuals with a sharp eye for detail. From profile pictures to YouTube thumbnails, give your ideas a signature look.",
    exploreServices:"Explore services ↗", trackOrder:"Track an order", whatWeDo:"What we create",
    servicesTitle:"Designed to stand out.", servicesSub:"Three ways to upgrade your visual world.",
    startProject:"Start a project", orderTitle:"Tell us what you imagine.",
    orderIntro:"Share your idea and references. You can follow the progress from your account.",
    needLogin:"Sign in to create an order.", service:"Service", style:"Visual style",
    colors:"Preferred colors", textToInclude:"Text to include", description:"Project description",
    references:"Reference images (optional)", imageLimit:"Images are automatically compressed. Maximum 3 images.",
    sendRequest:"Send project request ↗", welcome:"Welcome back.",
    accountIntro:"Sign in or create your creative workspace.", username:"Username",
    password:"Password", accountPrivacy:"Your username is visible to the studio. Never reuse an important password.",
    myOrdersTitle:"Your projects.", newProject:"New project +", signInOrders:"Sign in to see your orders.",
    adminTitle:"Studio dashboard.", adminIntro:"Manage customer requests, update progress and reply to messages.",
    footerRights:"All creative rights reserved.", footerTag:"Independent creative studio · Made with intention.",
    profile:"Profile pictures", profileDesc:"Distinctive profile visuals that make your identity recognizable.",
    thumbnail:"YouTube thumbnails", thumbnailDesc:"Eye-catching thumbnails designed to make people stop scrolling.",
    packs:"Creative packs", packsDesc:"A coherent collection of visuals built around your own style.",
    create:"Create a project", statusPending:"Pending", statusProgress:"In progress",
    statusReview:"Awaiting review", statusCompleted:"Completed", statusCancelled:"Cancelled",
    details:"Project details", openChat:"Open project chat", send:"Send", messagePlaceholder:"Write a message...",
    noOrders:"No projects yet. Start your first creative project.",
    customer:"Customer", created:"Created", updateStatus:"Update status", saveStatus:"Save status",
    uploadDelivery:"Send finished design", translate:"Translate", original:"Original",
    noMessages:"No messages yet. Start the conversation.", sending:"Sending...",
    orderCreated:"Your project request has been sent!", loginFirst:"Please sign in first.",
    fillFields:"Please complete the required fields.", usernameTaken:"This username is already taken.",
    badUsername:"Use 3 to 20 letters, numbers or underscores.",
    passwordShort:"Password must contain at least 6 characters.",
    loginError:"Unable to sign in. Check your username and password.",
    registerError:"Unable to create your account. Try another username.",
    uploadError:"One of your images could not be uploaded. Try a smaller image.",
    messageError:"Your message could not be sent.",
    statusSaved:"Project status updated.", accountCreated:"Your account has been created.",
    loggedOut:"You are signed out.", logout:"Sign out", noPermission:"You do not have permission.",
    fileTooLarge:"This image is too large. Try another image.",
    chooseImage:"Choose an image", adminOnly:"Administrator access only.",
    order:"Order", other:"Other", languageChanged:"Language updated."
  },
  fr: {
    navHome:"Accueil", navServices:"Services", navOrders:"Mes commandes", navAdmin:"Admin",
    login:"Connexion", register:"Créer un compte", heroEyebrow:"Studio créatif indépendant",
    heroTitle:'Rendez votre<br><span class="gradient-text">identité visuelle</span><br>inoubliable.',
    heroText:"Nous créons des visuels marquants avec le souci du détail. Photos de profil, miniatures YouTube et créations personnalisées.",
    exploreServices:"Découvrir les services ↗", trackOrder:"Suivre une commande", whatWeDo:"Nos créations",
    servicesTitle:"Pensé pour se démarquer.", servicesSub:"Trois façons de transformer votre univers visuel.",
    startProject:"Démarrer un projet", orderTitle:"Décrivez-nous votre idée.",
    orderIntro:"Présentez votre idée et ajoutez vos références. Suivez ensuite l'avancement depuis votre compte.",
    needLogin:"Connectez-vous pour créer une commande.", service:"Service", style:"Style visuel",
    colors:"Couleurs souhaitées", textToInclude:"Texte à intégrer", description:"Description du projet",
    references:"Images de référence (facultatif)", imageLimit:"Les images sont compressées automatiquement. 3 images maximum.",
    sendRequest:"Envoyer la demande ↗", welcome:"Bienvenue.",
    accountIntro:"Connectez-vous ou créez votre espace créatif.", username:"Pseudo",
    password:"Mot de passe", accountPrivacy:"Votre pseudo sera visible par le studio. N'utilisez pas un mot de passe important.",
    myOrdersTitle:"Vos projets.", newProject:"Nouveau projet +", signInOrders:"Connectez-vous pour voir vos commandes.",
    adminTitle:"Tableau de bord.", adminIntro:"Gérez les demandes, mettez à jour leur avancement et répondez aux messages.",
    footerRights:"Tous droits réservés.", footerTag:"Studio créatif indépendant · Créé avec intention.",
    profile:"Photos de profil", profileDesc:"Des visuels de profil uniques pour rendre votre identité reconnaissable.",
    thumbnail:"Miniatures YouTube", thumbnailDesc:"Des miniatures accrocheuses qui attirent l'attention.",
    packs:"Packs créatifs", packsDesc:"Une collection cohérente de visuels autour de votre propre style.",
    create:"Créer un projet", statusPending:"En attente", statusProgress:"En cours",
    statusReview:"En attente de validation", statusCompleted:"Terminé", statusCancelled:"Annulé",
    details:"Détails du projet", openChat:"Ouvrir la discussion", send:"Envoyer", messagePlaceholder:"Écrire un message...",
    noOrders:"Aucun projet pour le moment. Lancez votre première création.",
    customer:"Client", created:"Créé le", updateStatus:"Modifier le statut", saveStatus:"Enregistrer",
    uploadDelivery:"Envoyer le design final", translate:"Traduire", original:"Original",
    noMessages:"Aucun message. Lancez la discussion.", sending:"Envoi...",
    orderCreated:"Votre demande a bien été envoyée !", loginFirst:"Connectez-vous d'abord.",
    fillFields:"Veuillez remplir les champs obligatoires.", usernameTaken:"Ce pseudo est déjà utilisé.",
    badUsername:"Utilisez 3 à 20 lettres, chiffres ou tirets bas.",
    passwordShort:"Le mot de passe doit contenir au moins 6 caractères.",
    loginError:"Connexion impossible. Vérifiez votre pseudo et votre mot de passe.",
    registerError:"Création impossible. Essayez un autre pseudo.",
    uploadError:"Une image n'a pas pu être envoyée. Essayez une image plus légère.",
    messageError:"Votre message n'a pas pu être envoyé.",
    statusSaved:"Statut du projet mis à jour.", accountCreated:"Votre compte a été créé.",
    loggedOut:"Vous êtes déconnecté.", logout:"Déconnexion", noPermission:"Vous n'avez pas la permission.",
    fileTooLarge:"Cette image est trop lourde. Essayez-en une autre.",
    chooseImage:"Choisir une image", adminOnly:"Réservé à l'administration.",
    order:"Commande", other:"Autre", languageChanged:"Langue mise à jour."
  },
  de: {
    navHome:"Startseite", navServices:"Leistungen", navOrders:"Meine Aufträge", navAdmin:"Admin",
    login:"Anmelden", register:"Konto erstellen", heroEyebrow:"Unabhängiges Kreativstudio",
    heroTitle:'Mache deine<br><span class="gradient-text">visuelle Identität</span><br>unvergesslich.',
    heroText:"Wir gestalten ausdrucksstarke Designs mit viel Liebe zum Detail. Profilbilder, YouTube-Thumbnails und individuelle Kreationen.",
    exploreServices:"Leistungen entdecken ↗", trackOrder:"Auftrag verfolgen", whatWeDo:"Unsere Kreationen",
    servicesTitle:"Entwickelt, um aufzufallen.", servicesSub:"Drei Möglichkeiten für deine visuelle Welt.",
    startProject:"Projekt starten", orderTitle:"Erzähl uns von deiner Idee.",
    orderIntro:"Teile deine Idee und Referenzen. Verfolge den Fortschritt über dein Konto.",
    needLogin:"Melde dich an, um einen Auftrag zu erstellen.", service:"Leistung", style:"Visueller Stil",
    colors:"Gewünschte Farben", textToInclude:"Einzufügender Text", description:"Projektbeschreibung",
    references:"Referenzbilder (optional)", imageLimit:"Bilder werden automatisch komprimiert. Maximal 3 Bilder.",
    sendRequest:"Anfrage senden ↗", welcome:"Willkommen zurück.",
    accountIntro:"Melde dich an oder erstelle deinen Kreativbereich.", username:"Benutzername",
    password:"Passwort", accountPrivacy:"Dein Benutzername ist für das Studio sichtbar. Verwende kein wichtiges Passwort.",
    myOrdersTitle:"Deine Projekte.", newProject:"Neues Projekt +", signInOrders:"Melde dich an, um deine Aufträge zu sehen.",
    adminTitle:"Studio-Dashboard.", adminIntro:"Verwalte Anfragen, aktualisiere den Fortschritt und beantworte Nachrichten.",
    footerRights:"Alle Rechte vorbehalten.", footerTag:"Unabhängiges Kreativstudio · Mit Sorgfalt gestaltet.",
    profile:"Profilbilder", profileDesc:"Einzigartige Profilbilder für einen unverwechselbaren Auftritt.",
    thumbnail:"YouTube-Thumbnails", thumbnailDesc:"Auffällige Thumbnails, die sofort ins Auge fallen.",
    packs:"Kreativpakete", packsDesc:"Eine zusammenhängende Sammlung visueller Designs.",
    create:"Projekt erstellen", statusPending:"Ausstehend", statusProgress:"In Bearbeitung",
    statusReview:"Wartet auf Prüfung", statusCompleted:"Abgeschlossen", statusCancelled:"Abgebrochen",
    details:"Projektdetails", openChat:"Projektchat öffnen", send:"Senden", messagePlaceholder:"Nachricht schreiben...",
    noOrders:"Noch keine Projekte. Starte dein erstes kreatives Projekt.",
    customer:"Kunde", created:"Erstellt", updateStatus:"Status ändern", saveStatus:"Status speichern",
    uploadDelivery:"Fertiges Design senden", translate:"Übersetzen", original:"Original",
    noMessages:"Noch keine Nachrichten.", sending:"Wird gesendet...",
    orderCreated:"Deine Anfrage wurde gesendet!", loginFirst:"Bitte melde dich zuerst an.",
    fillFields:"Bitte fülle alle Pflichtfelder aus.", usernameTaken:"Dieser Benutzername ist bereits vergeben.",
    badUsername:"Verwende 3 bis 20 Buchstaben, Zahlen oder Unterstriche.",
    passwordShort:"Das Passwort muss mindestens 6 Zeichen enthalten.",
    loginError:"Anmeldung fehlgeschlagen. Überprüfe Benutzername und Passwort.",
    registerError:"Konto konnte nicht erstellt werden. Versuche einen anderen Namen.",
    uploadError:"Ein Bild konnte nicht hochgeladen werden. Versuche ein kleineres Bild.",
    messageError:"Deine Nachricht konnte nicht gesendet werden.",
    statusSaved:"Projektstatus aktualisiert.", accountCreated:"Dein Konto wurde erstellt.",
    loggedOut:"Du bist abgemeldet.", logout:"Abmelden", noPermission:"Keine Berechtigung.",
    fileTooLarge:"Dieses Bild ist zu groß. Versuche ein anderes Bild.",
    chooseImage:"Bild auswählen", adminOnly:"Nur für Administratoren.",
    order:"Auftrag", other:"Andere", languageChanged:"Sprache aktualisiert."
  }
};

function t(key) {
  return translations[currentLanguage]?.[key] || translations.en[key] || key;
}

function applyTranslations() {
  document.documentElement.lang = currentLanguage;
  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;
    if (translations[currentLanguage]?.[key]) {
      element.innerHTML = translations[currentLanguage][key];
    }
  });
  $("languageSelect").value = currentLanguage;
  $("authSubmit").textContent = authMode === "login" ? t("login") : t("register");
  $("accountButton").textContent = currentUser ? t("logout") : t("login");
}

function toast(message) {
  const element = $("toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 2800);
}

function showNotice(id, message, type = "error") {
  const element = $(id);
  element.textContent = message;
  element.className = `notice show ${type}`;
}

function clearNotice(id) {
  const element = $(id);
  element.textContent = "";
  element.className = "notice";
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  })[char]);
}

function usernameToEmail(username) {
  return `${username.toLowerCase()}@aerium-design.com`;
}

/* =========================================================
   NAVIGATION
========================================================= */

function showPage(page) {
  document.querySelectorAll("main > section").forEach(section => {
    section.classList.add("hidden");
  });

  const target = $(`page-${page}`);
  if (!target) return;

  target.classList.remove("hidden");

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  if (page === "orders") renderCustomerOrders();
  if (page === "admin" && isAdmin) renderAdminOrders();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.go));
});

$("accountButton").addEventListener("click", async () => {
  if (currentUser) {
    await signOut(auth);
    toast(t("loggedOut"));
  } else {
    showPage("auth");
  }
});

$("languageSelect").addEventListener("change", event => {
  currentLanguage = event.target.value;
  localStorage.setItem("aeriumLanguage", currentLanguage);
  applyTranslations();
  renderServiceCards();
  toast(t("languageChanged"));
});

/* =========================================================
   SERVICES
========================================================= */

const serviceData = [
  {
    id: "Profile picture",
    icon: "◈",
    title: "profile",
    description: "profileDesc",
    color: "#b98aff",
    background: "rgba(157,112,255,.15)"
  },
  {
    id: "YouTube thumbnail",
    icon: "▣",
    title: "thumbnail",
    description: "thumbnailDesc",
    color: "#63baff",
    background: "rgba(80,170,255,.15)"
  },
  {
    id: "Creative pack",
    icon: "✧",
    title: "packs",
    description: "packsDesc",
    color: "#ff8bd5",
    background: "rgba(255,120,210,.14)"
  }
];

function renderServiceCards() {
  const html = serviceData.map(service => `
    <article class="service-card" style="--glow:${service.color};--icon-bg:${service.background}">
      <div class="service-icon" style="color:${service.color}">${service.icon}</div>
      <h3>${escapeHTML(t(service.title))}</h3>
      <p>${escapeHTML(t(service.description))}</p>
      <button class="text-link" data-service="${escapeHTML(service.id)}">${escapeHTML(t("create"))} ↗</button>
    </article>
  `).join("");

  $("homeServices").innerHTML = html;
  $("allServices").innerHTML = html;

  document.querySelectorAll("[data-service]").forEach(button => {
    button.addEventListener("click", () => {
      $("orderService").value = button.dataset.service;
      showPage("services");
      $("orderForm").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
}

renderServiceCards();

/* =========================================================
   AUTHENTICATION
========================================================= */

function setAuthMode(mode) {
  authMode = mode;
  $("loginTab").classList.toggle("active", mode === "login");
  $("registerTab").classList.toggle("active", mode === "register");
  $("authSubmit").textContent = mode === "login" ? t("login") : t("register");
  $("authPassword").autocomplete = mode === "login" ? "current-password" : "new-password";
  clearNotice("authNotice");
}

$("loginTab").addEventListener("click", () => setAuthMode("login"));
$("registerTab").addEventListener("click", () => setAuthMode("register"));

$("authForm").addEventListener("submit", async event => {
  event.preventDefault();
  clearNotice("authNotice");

  const username = $("authUsername").value.trim();
  const normalized = username.toLowerCase();
  const password = $("authPassword").value;

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return showNotice("authNotice", t("badUsername"));
  }

  if (password.length < 6) {
    return showNotice("authNotice", t("passwordShort"));
  }

  const email = usernameToEmail(username);
  $("authSubmit").disabled = true;
  $("authSubmit").textContent = t("sending");

  try {
    if (authMode === "register") {
      if (normalized === "poe13") {
        throw new Error("reserved_username");
      }

      const usernameRef = doc(db, "usernames", normalized);
      const usernameSnap = await getDoc(usernameRef);

      if (usernameSnap.exists()) {
        throw new Error("username_taken");
      }

      const credential = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(usernameRef, {
        uid: credential.user.uid,
        username,
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, "profiles", credential.user.uid), {
        uid: credential.user.uid,
        username,
        createdAt: serverTimestamp()
      });

      showNotice("authNotice", t("accountCreated"), "success");
      toast(t("accountCreated"));
      showPage("orders");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      showPage("orders");
    }
  } catch (error) {
    console.error(error);

    if (error.message === "username_taken") {
      showNotice("authNotice", t("usernameTaken"));
    } else if (error.message === "reserved_username") {
      showNotice("authNotice", t("registerError"));
    } else if (authMode === "login") {
      showNotice("authNotice", t("loginError"));
    } else {
      showNotice("authNotice", t("registerError"));
    }
  } finally {
    $("authSubmit").disabled = false;
    $("authSubmit").textContent = authMode === "login" ? t("login") : t("register");
  }
});

/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(auth, async user => {
  currentUser = user;
  currentUsername = "";
  isAdmin = false;

  if (user) {
    isAdmin = user.uid === ADMIN_UID;

    try {
      const profileSnap = await getDoc(doc(db, "profiles", user.uid));

      if (profileSnap.exists()) {
        currentUsername = profileSnap.data().username || "";
      } else if (isAdmin) {
        currentUsername = "POE13";
      }
    } catch (error) {
      console.error("Profile error:", error);
    }
  }

  $("userLabel").textContent = user ? currentUsername : "";
  $("accountButton").textContent = user ? t("logout") : t("login");
  $("adminNav").classList.toggle("hidden", !isAdmin);
  $("orderLoginNotice").classList.toggle("hidden", !!user);
  $("orderForm").classList.toggle("hidden", !user);

  if (!user) {
    $("ordersList").innerHTML = `<div class="empty">${escapeHTML(t("signInOrders"))}</div>`;
    $("adminOrders").innerHTML = "";
  }

  applyTranslations();

  if (user) {
    showPage("orders");
  } else {
    showPage("home");
  }
});

/* =========================================================
   IMAGE COMPRESSION
   Images are saved directly in Firestore.
   No Firebase Storage is used.
========================================================= */

async function compressImage(file) {
  if (!file.type.startsWith("image/")) {
    throw new Error("invalid_image");
  }

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = objectUrl;
    });

    const maxDimension = 1200;
    const ratio = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");

    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));

    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let quality = 0.82;
    let blob = await canvasToBlob(canvas, quality);

    while (blob.size > 450 * 1024 && quality > 0.32) {
      quality -= 0.08;
      blob = await canvasToBlob(canvas, quality);
    }

    if (blob.size > 450 * 1024) {
      throw new Error("image_too_large");
    }

    const dataUrl = await blobToDataURL(blob);

    return {
      dataUrl,
      name: file.name.slice(0, 100),
      mime: "image/webp",
      size: blob.size
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error("compression_failed"));
    }, "image/webp", quality);
  });
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/* =========================================================
   ORDER IMAGE PREVIEW
========================================================= */

$("referenceFiles").addEventListener("change", async event => {
  const files = [...event.target.files].slice(0, 3);
  $("referencePreview").innerHTML = "";

  for (const file of files) {
    const image = document.createElement("img");
    image.alt = file.name;
    image.src = URL.createObjectURL(file);
    $("referencePreview").appendChild(image);
  }
});

/* =========================================================
   CREATE ORDER
========================================================= */

$("orderForm").addEventListener("submit", async event => {
  event.preventDefault();
  clearNotice("orderNotice");

  if (!currentUser) {
    return showNotice("orderNotice", t("loginFirst"));
  }

  const description = $("orderDescription").value.trim();

  if (!description) {
    return showNotice("orderNotice", t("fillFields"));
  }

  const selectedFiles = [...$("referenceFiles").files].slice(0, 3);
  const submitButton = $("submitOrder");
  submitButton.disabled = true;
  submitButton.textContent = t("sending");

  try {
    const orderRef = await addDoc(collection(db, "orders"), {
      uid: currentUser.uid,
      username: currentUsername,
      service: $("orderService").value,
      style: $("orderStyle").value,
      colors: $("orderColors").value.trim().slice(0, 150),
      text: $("orderText").value.trim().slice(0, 150),
      description: description.slice(0, 3000),
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    for (const file of selectedFiles) {
      const compressed = await compressImage(file);

      await addDoc(collection(db, "orders", orderRef.id, "files"), {
        uid: currentUser.uid,
        username: currentUsername,
        type: "reference",
        name: compressed.name,
        mime: compressed.mime,
        dataUrl: compressed.dataUrl,
        createdAt: serverTimestamp()
      });
    }

    $("orderForm").reset();
    $("referencePreview").innerHTML = "";
    showNotice("orderNotice", t("orderCreated"), "success");
    toast(t("orderCreated"));
    showPage("orders");
  } catch (error) {
    console.error("Create order error:", error);

    if (error.message === "image_too_large") {
      showNotice("orderNotice", t("fileTooLarge"));
    } else {
      showNotice("orderNotice", t("uploadError"));
    }
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = t("sendRequest");
  }
});

/* =========================================================
   ORDER HELPERS
========================================================= */

function statusLabel(status) {
  const map = {
    pending: "statusPending",
    progress: "statusProgress",
    review: "statusReview",
    completed: "statusCompleted",
    cancelled: "statusCancelled"
  };
  return t(map[status] || "statusPending");
}

function formatDate(timestamp) {
  if (!timestamp) return "—";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString(currentLanguage === "fr" ? "fr-FR" : currentLanguage === "de" ? "de-DE" : "en-GB");
}

function orderCardHTML(order, id, adminMode = false) {
  const status = order.status || "pending";
  const statusClass = status === "completed" ? "completed" : status === "cancelled" ? "cancelled" : "";

  return `
    <article class="order-card" id="order-${escapeHTML(id)}">
      <div class="order-top">
        <div>
          <h3>${escapeHTML(order.service || t("order"))}</h3>
          <div class="order-meta">
            ${adminMode ? `${escapeHTML(t("customer"))}: ${escapeHTML(order.username || "—")} · ` : ""}
            ${escapeHTML(t("created"))}: ${escapeHTML(formatDate(order.createdAt))}
          </div>
        </div>
        <span class="status ${statusClass}">${escapeHTML(statusLabel(status))}</span>
      </div>

      <div class="order-actions">
        <button class="btn secondary" data-open-order="${escapeHTML(id)}">${escapeHTML(t("details"))}</button>
        <button class="btn ghost" data-open-chat="${escapeHTML(id)}">${escapeHTML(t("openChat"))}</button>
      </div>

      <div class="order-detail hidden" id="detail-${escapeHTML(id)}">
        <p><strong>${escapeHTML(t("style"))}:</strong> ${escapeHTML(order.style || "—")}</p>
        <p><strong>${escapeHTML(t("colors"))}:</strong> ${escapeHTML(order.colors || "—")}</p>
        <p><strong>${escapeHTML(t("textToInclude"))}:</strong> ${escapeHTML(order.text || "—")}</p>
        <p><strong>${escapeHTML(t("description"))}:</strong><br>${escapeHTML(order.description || "—")}</p>
        <div class="file-preview" id="files-${escapeHTML(id)}"></div>
        ${adminMode ? adminControlsHTML(id, status) : ""}
      </div>

      <div class="chat-box hidden" id="chat-${escapeHTML(id)}">
        <div class="chat-messages" id="messages-${escapeHTML(id)}">
          <div class="empty">${escapeHTML(t("noMessages"))}</div>
        </div>
        <form class="chat-compose" data-message-form="${escapeHTML(id)}">
          <input name="message" maxlength="1500" placeholder="${escapeHTML(t("messagePlaceholder"))}" required>
          <button class="btn" type="submit">${escapeHTML(t("send"))}</button>
        </form>
        ${adminMode ? `
          <div style="padding:10px;border-top:1px solid var(--line)">
            <label>${escapeHTML(t("uploadDelivery"))}</label>
            <input type="file" accept="image/png,image/jpeg,image/webp" data-delivery-file="${escapeHTML(id)}">
          </div>` : ""}
        <div class="file-preview" id="chatfiles-${escapeHTML(id)}"></div>
      </div>
    </article>
  `;
}

function adminControlsHTML(id, status) {
  return `
    <div class="admin-tools" style="margin-top:15px">
      <select id="status-${escapeHTML(id)}">
        <option value="pending" ${status === "pending" ? "selected" : ""}>${escapeHTML(t("statusPending"))}</option>
        <option value="progress" ${status === "progress" ? "selected" : ""}>${escapeHTML(t("statusProgress"))}</option>
        <option value="review" ${status === "review" ? "selected" : ""}>${escapeHTML(t("statusReview"))}</option>
        <option value="completed" ${status === "completed" ? "selected" : ""}>${escapeHTML(t("statusCompleted"))}</option>
        <option value="cancelled" ${status === "cancelled" ? "selected" : ""}>${escapeHTML(t("statusCancelled"))}</option>
      </select>
      <button class="btn" data-save-status="${escapeHTML(id)}">${escapeHTML(t("saveStatus"))}</button>
    </div>
  `;
}

/* =========================================================
   CUSTOMER ORDERS
========================================================= */

async function renderCustomerOrders() {
  if (!currentUser) {
    $("ordersList").innerHTML = `<div class="empty">${escapeHTML(t("signInOrders"))}</div>`;
    return;
  }

  $("ordersList").innerHTML = `<div class="empty">${escapeHTML(t("sending"))}</div>`;

  try {
    const ordersQuery = query(
      collection(db, "orders"),
      where("uid", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(ordersQuery);

    if (snapshot.empty) {
      $("ordersList").innerHTML = `<div class="empty">${escapeHTML(t("noOrders"))}</div>`;
      return;
    }

    $("ordersList").innerHTML = snapshot.docs.map(item =>
      orderCardHTML(item.data(), item.id, false)
    ).join("");

    attachOrderActions(false);
  } catch (error) {
    console.error("Customer orders error:", error);
    $("ordersList").innerHTML = `<div class="empty">${escapeHTML(t("noPermission"))}</div>`;
  }
}

/* =========================================================
   ADMIN ORDERS
========================================================= */

async function renderAdminOrders() {
  if (!isAdmin) {
    $("adminOrders").innerHTML = `<div class="empty">${escapeHTML(t("adminOnly"))}</div>`;
    return;
  }

  $("adminOrders").innerHTML = `<div class="empty">${escapeHTML(t("sending"))}</div>`;

  try {
    const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(ordersQuery);

    if (snapshot.empty) {
      $("adminOrders").innerHTML = `<div class="empty">${escapeHTML(t("noOrders"))}</div>`;
      return;
    }

    $("adminOrders").innerHTML = snapshot.docs.map(item =>
      orderCardHTML(item.data(), item.id, true)
    ).join("");

    attachOrderActions(true);
  } catch (error) {
    console.error("Admin orders error:", error);
    $("adminOrders").innerHTML = `<div class="empty">${escapeHTML(t("noPermission"))}</div>`;
  }
}

/* =========================================================
   ORDER ACTIONS
========================================================= */

function attachOrderActions(adminMode) {
  document.querySelectorAll("[data-open-order]").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.openOrder;
      const detail = $(`detail-${id}`);
      detail.classList.toggle("hidden");

      if (!detail.classList.contains("hidden")) {
        await loadOrderFiles(id, `files-${id}`);
      }
    });
  });

  document.querySelectorAll("[data-open-chat]").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.openChat;
      const chat = $(`chat-${id}`);
      chat.classList.toggle("hidden");

      if (!chat.classList.contains("hidden")) {
        listenToMessages(id);
        await loadOrderFiles(id, `chatfiles-${id}`);
      }
    });
  });

  document.querySelectorAll("[data-message-form]").forEach(form => {
    form.addEventListener("submit", async event => {
      event.preventDefault();

      if (!currentUser) return;

      const orderId = form.dataset.messageForm;
      const input = form.querySelector("input[name='message']");
      const message = input.value.trim();

      if (!message) return;

      const submit = form.querySelector("button");
      submit.disabled = true;

      try {
        await addDoc(collection(db, "orders", orderId, "messages"), {
          uid: currentUser.uid,
          username: currentUsername,
          text: message.slice(0, 1500),
          createdAt: serverTimestamp()
        });

        input.value = "";
      } catch (error) {
        console.error(error);
        toast(t("messageError"));
      } finally {
        submit.disabled = false;
      }
    });
  });

  if (adminMode) {
    document.querySelectorAll("[data-save-status]").forEach(button => {
      button.addEventListener("click", async () => {
        const id = button.dataset.saveStatus;
        const status = $(`status-${id}`).value;

        try {
          await updateDoc(doc(db, "orders", id), {
            status,
            updatedAt: serverTimestamp()
          });

          toast(t("statusSaved"));
          renderAdminOrders();
        } catch (error) {
          console.error(error);
          toast(t("noPermission"));
        }
      });
    });

    document.querySelectorAll("[data-delivery-file]").forEach(input => {
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) return;

        try {
          const compressed = await compressImage(file);
          const orderId = input.dataset.deliveryFile;

          await addDoc(collection(db, "orders", orderId, "files"), {
            uid: currentUser.uid,
            username: currentUsername,
            type: "delivery",
            name: compressed.name,
            mime: compressed.mime,
            dataUrl: compressed.dataUrl,
            createdAt: serverTimestamp()
          });

          toast(t("send"));
          await loadOrderFiles(orderId, `chatfiles-${orderId}`);
        } catch (error) {
          console.error(error);
          toast(error.message === "image_too_large" ? t("fileTooLarge") : t("uploadError"));
        }

        input.value = "";
      });
    });
  }
}

/* =========================================================
   CHAT LIVE LISTENER
========================================================= */

function listenToMessages(orderId) {
  if (chatListeners.has(orderId)) return;

  const messagesQuery = query(
    collection(db, "orders", orderId, "messages"),
    orderBy("createdAt", "asc")
  );

  const unsubscribe = onSnapshot(messagesQuery, snapshot => {
    const container = $(`messages-${orderId}`);
    if (!container) return;

    if (snapshot.empty) {
      container.innerHTML = `<div class="empty">${escapeHTML(t("noMessages"))}</div>`;
      return;
    }

    container.innerHTML = snapshot.docs.map(item => {
      const message = item.data();
      const mine = message.uid === currentUser?.uid;

      return `
        <div class="message ${mine ? "mine" : ""}">
          <small>${escapeHTML(message.username || "User")} · ${escapeHTML(formatDate(message.createdAt))}</small>
          <p>${escapeHTML(message.text || "")}</p>
          <button class="text-link" data-translate-message="${escapeHTML(item.id)}" data-original="${escapeHTML(message.text || "")}" style="margin-top:7px">
            ${escapeHTML(t("translate"))}
          </button>
          <p class="translated-text muted" id="translated-${escapeHTML(item.id)}"></p>
        </div>
      `;
    }).join("");

    container.scrollTop = container.scrollHeight;

    container.querySelectorAll("[data-translate-message]").forEach(button => {
      button.addEventListener("click", async () => {
        const original = button.dataset.original;
        const target = $(`translated-${button.dataset.translateMessage}`);

        button.disabled = true;
        target.textContent = "…";

        try {
          const translated = await translateMessage(original, currentLanguage);
          target.textContent = translated;
        } catch {
          target.textContent = original;
        } finally {
          button.disabled = false;
        }
      });
    });
  }, error => {
    console.error("Chat listener error:", error);
  });

  chatListeners.set(orderId, unsubscribe);
}

/* =========================================================
   MESSAGE TRANSLATION
========================================================= */

async function translateMessage(message, language) {
  const targetLanguage = language;
  const sourceLanguage = "auto";

  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", message.slice(0, 450));
  url.searchParams.set("langpair", `${sourceLanguage}|${targetLanguage}`);

  const response = await fetch(url);
  if (!response.ok) throw new Error("translation_failed");

  const data = await response.json();
  return data.responseData?.translatedText || message;
}

/* =========================================================
   ORDER FILES
========================================================= */

async function loadOrderFiles(orderId, containerId) {
  const container = $(containerId);
  if (!container) return;

  try {
    const filesQuery = query(
      collection(db, "orders", orderId, "files"),
      orderBy("createdAt", "asc")
    );

    const snapshot = await getDocs(filesQuery);

    if (!container.isConnected) return;

    container.innerHTML = snapshot.docs.map(item => {
      const file = item.data();

      return `
        <div class="file-item">
          <a href="${escapeHTML(file.dataUrl)}" target="_blank" rel="noopener">
            <img src="${escapeHTML(file.dataUrl)}" alt="${escapeHTML(file.name || "Project image")}">
          </a>
          <small>${escapeHTML(file.type === "delivery" ? "✓ Final design" : file.name || "Reference")}</small>
        </div>
      `;
    }).join("");
  } catch (error) {
    console.error("Files loading error:", error);
  }
}

/* =========================================================
   CLEANUP AND STARTUP
========================================================= */

window.addEventListener("beforeunload", () => {
  for (const unsubscribe of chatListeners.values()) {
    unsubscribe();
  }
  chatListeners.clear();

  if (unsubscribeOrders) unsubscribeOrders();
  if (unsubscribeAdminOrders) unsubscribeAdminOrders();
});

applyTranslations();
showPage("home");
