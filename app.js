
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, collection, addDoc,
  query, where, orderBy, onSnapshot, getDocs, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";

/* -------------------------------------------------------
   FIREBASE CONFIGURATION
------------------------------------------------------- */

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/*
  IMPORTANT:
  Create the administrator account in Firebase Authentication first.
  Then copy its Firebase UID into ADMIN_UID below.
*/
const ADMIN_UID = "ADD_YOUR_ADMIN_FIREBASE_UID_HERE";
const ADMIN_USERNAME = "POE13";
const ADMIN_EMAIL = "poe13@aerium-design.com";

let currentUser = null;
let isAdmin = false;
let registerMode = false;
let activeOrderId = null;
let stopMessages = null;
let stopOrders = null;
let language = localStorage.getItem("aerium-language") || "en";

/* -------------------------------------------------------
   TRANSLATIONS
------------------------------------------------------- */

const translations = {
  en: {
    login:"Sign in", startOrder:"Start a project ↗",
    eyebrow:"Independent creative studio",
    heroTitle:'Ideas deserve<br><span>better visuals.</span>',
    heroCopy:"We create distinctive visuals for creators, channels and digital identities. Thoughtful design, bold details and a finish that stands out.",
    explore:"Explore services", note1:"Made for creators", note2:"Custom artwork", note3:"Direct communication",
    floatText:"Creative direction", whatWeDo:"What we do",
    servicesTitle:"Design that gets noticed.",
    servicesSub:"Three ways to give your content a stronger identity.",
    service1:"Profile pictures",service1Desc:"A recognizable identity, crafted around your style and personality.",
    service2:"YouTube thumbnails",service2Desc:"Strong compositions and clear visual storytelling for your videos.",
    service3:"Creative packs",service3Desc:"A coordinated set of visuals to make your whole presence consistent.",
    stripTitle:"Have an idea in mind?",stripCopy:"Tell us what you imagine. We'll take it from brief to final artwork.",
    footer:"Designed to make your ideas visible.",logout:"Sign out",
    myOrders:"My orders",newOrder:"New project",settings:"Settings",
    serviceLabel:"Service",styleLabel:"Style and inspiration",colorsLabel:"Preferred colors",
    textLabel:"Text to include",descriptionLabel:"Describe your idea",
    referenceLabel:"Reference images (optional)",sendOrder:"Send project request ↗",
    languageLabel:"Interface language",settingsInfo:"Your account is secured by Firebase Authentication.",
    username:"Username",password:"Password",
    authLoginTitle:"Welcome back.",authLoginSub:"Sign in to manage your creative projects.",
    authRegisterTitle:"Create your account.",authRegisterSub:"Join Aérium and start your first project.",
    noAccount:"Don't have an account?",hasAccount:"Already have an account?",
    create:"Create one",signIn:"Sign in",
    orderSent:"Your project request has been sent!",
    orderError:"Unable to send your request. Please try again.",
    noOrders:"No projects yet. Start your first one!",
    openChat:"Open conversation",status:"Status",
    chatEmpty:"No messages yet. Start the conversation!",
    messageError:"Message could not be sent.",
    admin:"Administrator",customer:"Client",
    updateStatus:"Update status",newStatus:"New",inProgress:"In progress",
    review:"Review",completed:"Completed",cancelled:"Cancelled",
    chooseFile:"Choose an image first.",fileTooLarge:"Image must be smaller than 5 MB.",
    sent:"Sent successfully.",project:"Project",
    refUploaded:"Reference images uploaded",delivered:"Final artwork delivered",
    authError:"Connection failed. Check your username and password.",
    usernameTaken:"This username is already taken.",
    invalidUsername:"Use 3 to 24 letters or numbers. No spaces.",
    passwordShort:"Password must contain at least 6 characters.",
    registerError:"Account creation failed. Please try again."
  },
  fr: {
    login:"Connexion",startOrder:"Créer un projet ↗",
    eyebrow:"Studio créatif indépendant",
    heroTitle:'Vos idées méritent<br><span>un meilleur design.</span>',
    heroCopy:"Nous créons des visuels uniques pour les créateurs, les chaînes et les identités numériques. Du design soigné, des détails forts et un résultat qui se démarque.",
    explore:"Découvrir les services",note1:"Pensé pour les créateurs",note2:"Créations personnalisées",note3:"Échange direct",
    floatText:"Direction artistique",whatWeDo:"Nos services",
    servicesTitle:"Un design qui se remarque.",
    servicesSub:"Trois façons de renforcer l'identité de votre contenu.",
    service1:"Photos de profil",service1Desc:"Une identité reconnaissable, créée autour de votre style et de votre personnalité.",
    service2:"Miniatures YouTube",service2Desc:"Des compositions fortes et une vraie histoire visuelle pour vos vidéos.",
    service3:"Packs créatifs",service3Desc:"Un ensemble de visuels cohérents pour toute votre présence en ligne.",
    stripTitle:"Vous avez une idée en tête ?",stripCopy:"Expliquez-nous votre projet. Nous le transformerons en création finale.",
    footer:"Donner vie à vos idées.",logout:"Déconnexion",
    myOrders:"Mes commandes",newOrder:"Nouveau projet",settings:"Paramètres",
    serviceLabel:"Service",styleLabel:"Style et inspiration",colorsLabel:"Couleurs souhaitées",
    textLabel:"Texte à intégrer",descriptionLabel:"Décrivez votre idée",
    referenceLabel:"Images de référence (facultatif)",sendOrder:"Envoyer la demande ↗",
    languageLabel:"Langue du site",settingsInfo:"Votre compte est sécurisé par Firebase Authentication.",
    username:"Nom d'utilisateur",password:"Mot de passe",
    authLoginTitle:"Bon retour.",authLoginSub:"Connectez-vous pour gérer vos projets.",
    authRegisterTitle:"Créer un compte.",authRegisterSub:"Rejoignez Aérium et lancez votre premier projet.",
    noAccount:"Vous n'avez pas de compte ?",hasAccount:"Vous avez déjà un compte ?",
    create:"Créer un compte",signIn:"Se connecter",
    orderSent:"Votre demande a bien été envoyée !",
    orderError:"Impossible d'envoyer la demande. Réessayez.",
    noOrders:"Aucun projet pour le moment. Lancez votre premier projet !",
    openChat:"Ouvrir la conversation",status:"Statut",
    chatEmpty:"Aucun message. Lancez la conversation !",
    messageError:"Le message n'a pas pu être envoyé.",
    admin:"Administrateur",customer:"Client",
    updateStatus:"Modifier le statut",newStatus:"Nouveau",inProgress:"En cours",
    review:"À valider",completed:"Terminé",cancelled:"Annulé",
    chooseFile:"Choisissez d'abord une image.",fileTooLarge:"L'image doit faire moins de 5 Mo.",
    sent:"Envoyé avec succès.",project:"Projet",
    refUploaded:"Images de référence envoyées",delivered:"Création finale envoyée",
    authError:"Connexion impossible. Vérifiez votre identifiant et votre mot de passe.",
    usernameTaken:"Ce nom d'utilisateur est déjà utilisé.",
    invalidUsername:"Utilisez 3 à 24 lettres ou chiffres, sans espace.",
    passwordShort:"Le mot de passe doit contenir au moins 6 caractères.",
    registerError:"La création du compte a échoué. Réessayez."
  },
  de: {
    login:"Anmelden",startOrder:"Projekt starten ↗",
    eyebrow:"Unabhängiges Kreativstudio",
    heroTitle:'Ideen verdienen<br><span>besseres Design.</span>',
    heroCopy:"Wir gestalten einzigartige Visuals für Creator, Kanäle und digitale Identitäten. Durchdachtes Design, starke Details und ein unverwechselbares Ergebnis.",
    explore:"Services entdecken",note1:"Für Creator",note2:"Individuelle Designs",note3:"Direkter Kontakt",
    floatText:"Kreative Leitung",whatWeDo:"Unsere Leistungen",
    servicesTitle:"Design, das auffällt.",
    servicesSub:"Drei Möglichkeiten, deine Inhalte unverwechselbar zu machen.",
    service1:"Profilbilder",service1Desc:"Eine erkennbare Identität, passend zu deinem Stil und deiner Persönlichkeit.",
    service2:"YouTube-Thumbnails",service2Desc:"Starke Kompositionen und visuelles Storytelling für deine Videos.",
    service3:"Kreativpakete",service3Desc:"Abgestimmte Designs für einen einheitlichen Online-Auftritt.",
    stripTitle:"Du hast eine Idee?",stripCopy:"Erzähl uns davon. Wir machen daraus ein fertiges Design.",
    footer:"Wir machen deine Ideen sichtbar.",logout:"Abmelden",
    myOrders:"Meine Aufträge",newOrder:"Neues Projekt",settings:"Einstellungen",
    serviceLabel:"Service",styleLabel:"Stil und Inspiration",colorsLabel:"Wunschfarben",
    textLabel:"Einzufügender Text",descriptionLabel:"Beschreibe deine Idee",
    referenceLabel:"Referenzbilder (optional)",sendOrder:"Anfrage senden ↗",
    languageLabel:"Sprache",settingsInfo:"Dein Konto wird durch Firebase Authentication geschützt.",
    username:"Benutzername",password:"Passwort",
    authLoginTitle:"Willkommen zurück.",authLoginSub:"Melde dich an, um deine Projekte zu verwalten.",
    authRegisterTitle:"Konto erstellen.",authRegisterSub:"Starte dein erstes Projekt mit Aérium.",
    noAccount:"Noch kein Konto?",hasAccount:"Du hast bereits ein Konto?",
    create:"Konto erstellen",signIn:"Anmelden",
    orderSent:"Deine Projektanfrage wurde gesendet!",
    orderError:"Anfrage konnte nicht gesendet werden.",
    noOrders:"Noch keine Projekte. Starte dein erstes!",
    openChat:"Chat öffnen",status:"Status",
    chatEmpty:"Noch keine Nachrichten. Starte den Chat!",
    messageError:"Nachricht konnte nicht gesendet werden.",
    admin:"Administrator",customer:"Kunde",
    updateStatus:"Status ändern",newStatus:"Neu",inProgress:"In Bearbeitung",
    review:"Prüfung",completed:"Abgeschlossen",cancelled:"Abgebrochen",
    chooseFile:"Wähle zuerst ein Bild aus.",fileTooLarge:"Das Bild muss kleiner als 5 MB sein.",
    sent:"Erfolgreich gesendet.",project:"Projekt",
    refUploaded:"Referenzbilder hochgeladen",delivered:"Finales Design geliefert",
    authError:"Anmeldung fehlgeschlagen. Überprüfe deine Zugangsdaten.",
    usernameTaken:"Dieser Benutzername ist bereits vergeben.",
    invalidUsername:"Verwende 3 bis 24 Buchstaben oder Zahlen ohne Leerzeichen.",
    passwordShort:"Das Passwort muss mindestens 6 Zeichen enthalten.",
    registerError:"Konto konnte nicht erstellt werden."
  }
};

function t(key) {
  return translations[language]?.[key] || translations.en[key] || key;
}

function applyLanguage() {
  document.documentElement.lang = language;
  document.getElementById("language").value = language;
  document.getElementById("languageSettings").value = language;

  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;
    if (translations[language]?.[key]) {
      element.innerHTML = translations[language][key];
    }
  });

  if (registerMode) updateAuthModal();
}

function setLanguage(value) {
  language = value;
  localStorage.setItem("aerium-language", value);
  applyLanguage();
}

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

function $(id) {
  return document.getElementById(id);
}

function showModal(id) {
  $(id).classList.add("show");
}

function hideModal(id) {
  $(id).classList.remove("show");
}

function usernameToEmail(username) {
  return username.trim().toLowerCase() + "@aerium-design.com";
}

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;",
    '"':"&quot;", "'":"&#039;"
  }[char]));
}

function setMessage(id, message, success = false) {
  const element = $(id);
  element.textContent = message;
  element.style.color = success ? "#8ce4bd" : "#ff9dba";
}

function switchTab(tab) {
  document.querySelectorAll(".dash-side button").forEach(button => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
  ["orders", "new", "settings"].forEach(name => {
    $("tab-" + name).classList.toggle("hidden", name !== tab);
  });
}

function showDashboard() {
  $("home").classList.add("hidden");
  $("dashboard").classList.add("active");
  $("accountBtn").textContent = currentUser ? currentUser.displayName || "Account" : t("login");
  $("dashTitle").textContent = isAdmin ? "Administrator workspace" : "Your workspace";
  $("adminTools").classList.toggle("hidden", !isAdmin);
  switchTab("orders");
  loadOrders();
}

function showHome() {
  $("dashboard").classList.remove("active");
  $("home").classList.remove("hidden");
  $("accountBtn").textContent = t("login");
  if (stopOrders) stopOrders();
  stopOrders = null;
}

/* -------------------------------------------------------
   AUTHENTICATION
------------------------------------------------------- */

function updateAuthModal() {
  $("authTitle").textContent = registerMode ? t("authRegisterTitle") : t("authLoginTitle");
  $("authSubtitle").textContent = registerMode ? t("authRegisterSub") : t("authLoginSub");
  $("authSubmit").textContent = registerMode ? t("create") : t("signIn");
  $("switchText").textContent = registerMode ? t("hasAccount") : t("noAccount");
  $("switchAuth").textContent = registerMode ? t("signIn") : t("create");
  $("password").autocomplete = registerMode ? "new-password" : "current-password";
}

$("accountBtn").addEventListener("click", () => {
  if (currentUser) {
    showDashboard();
  } else {
    registerMode = false;
    updateAuthModal();
    showModal("authModal");
  }
});

$("switchAuth").addEventListener("click", () => {
  registerMode = !registerMode;
  $("authMessage").textContent = "";
  updateAuthModal();
});

$("authForm").addEventListener("submit", async event => {
  event.preventDefault();

  const username = $("username").value.trim();
  const password = $("password").value;
  const normalized = username.toLowerCase();

  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    return setMessage("authMessage", t("invalidUsername"));
  }

  if (password.length < 6) {
    return setMessage("authMessage", t("passwordShort"));
  }

  $("authSubmit").disabled = true;
  $("authSubmit").textContent = "Please wait…";

  try {
    const email = usernameToEmail(username);

    if (registerMode) {
      if (normalized === ADMIN_USERNAME.toLowerCase()) {
        throw new Error("This username is reserved.");
      }

      const usernameRef = doc(db, "usernames", normalized);
      const existing = await getDoc(usernameRef);

      if (existing.exists()) {
        throw new Error("USERNAME_TAKEN");
      }

      const credential = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(usernameRef, {
        uid: credential.user.uid,
        username,
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, "profiles", credential.user.uid), {
        username,
        createdAt: serverTimestamp()
      });

    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }

    hideModal("authModal");
    $("authForm").reset();

  } catch (error) {
    console.error(error);

    if (error.message === "USERNAME_TAKEN") {
      setMessage("authMessage", t("usernameTaken"));
    } else if (error.code === "auth/email-already-in-use") {
      setMessage("authMessage", t("usernameTaken"));
    } else if (error.message === "This username is reserved.") {
      setMessage("authMessage", "This username is reserved for the administrator.");
    } else {
      setMessage("authMessage", registerMode ? t("registerError") : t("authError"));
    }
  } finally {
    $("authSubmit").disabled = false;
    updateAuthModal();
  }
});

$("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  showHome();
});

onAuthStateChanged(auth, async user => {
  currentUser = user;

  if (!user) {
    isAdmin = false;
    showHome();
    return;
  }

  isAdmin = ADMIN_UID !== "ADD_YOUR_ADMIN_FIREBASE_UID_HERE"
    && user.uid === ADMIN_UID;

  const profile = await getDoc(doc(db, "profiles", user.uid));
  const username = profile.exists()
    ? profile.data().username
    : (isAdmin ? ADMIN_USERNAME : "Account");

  currentUser.displayName = username;
  showDashboard();
});

/* -------------------------------------------------------
   ORDERS
------------------------------------------------------- */

document.querySelectorAll(".service").forEach(card => {
  card.addEventListener("click", () => {
    $("serviceSelect").value = card.dataset.service;
    startOrder();
  });
});

function startOrder() {
  if (!currentUser) {
    registerMode = false;
    updateAuthModal();
    showModal("authModal");
    return;
  }
  showDashboard();
  switchTab("new");
}

["orderTop", "orderHero", "orderStrip"].forEach(id => {
  $(id).addEventListener("click", startOrder);
});

$("exploreBtn").addEventListener("click", () => {
  $("services").scrollIntoView({ behavior: "smooth" });
});

document.querySelectorAll(".dash-side button").forEach(button => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

$("orderForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!currentUser) return;

  const files = [...$("referenceFiles").files];

  if (files.length > 5) {
    return setMessage("orderMessage", "Maximum 5 reference images.");
  }

  if (files.some(file => file.size > 5 * 1024 * 1024)) {
    return setMessage("orderMessage", t("fileTooLarge"));
  }

  const submit = $("orderForm").querySelector("button[type=submit]");
  submit.disabled = true;

  try {
    const order = {
      uid: currentUser.uid,
      username: currentUser.displayName,
      service: $("serviceSelect").value,
      style: $("styleInput").value.trim(),
      colors: $("colorsInput").value.trim(),
      designText: $("designText").value.trim(),
      description: $("descriptionInput").value.trim(),
      status: "New",
      createdAt: serverTimestamp(),
      referenceUrls: []
    };

    const orderRef = await addDoc(collection(db, "orders"), order);
    const urls = [];

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const fileRef = ref(storage, `orders/${orderRef.id}/references/${Date.now()}_${index}_${file.name}`);
      await uploadBytes(fileRef, file);
      urls.push(await getDownloadURL(fileRef));
    }

    if (urls.length) {
      await updateDoc(orderRef, { referenceUrls: urls });
    }

    $("orderForm").reset();
    setMessage("orderMessage", t("orderSent"), true);
    switchTab("orders");

  } catch (error) {
    console.error(error);
    setMessage("orderMessage", t("orderError"));
  } finally {
    submit.disabled = false;
  }
});

function loadOrders() {
  if (!currentUser) return;
  if (stopOrders) stopOrders();

  const ordersRef = collection(db, "orders");
  const q = isAdmin
    ? query(ordersRef, orderBy("createdAt", "desc"))
    : query(ordersRef, where("uid", "==", currentUser.uid), orderBy("createdAt", "desc"));

  stopOrders = onSnapshot(q, snapshot => {
    const list = $("orderList");
    list.innerHTML = "";

    if (snapshot.empty) {
      list.innerHTML = `<div class="empty">${safeText(t("noOrders"))}</div>`;
      return;
    }

    snapshot.forEach(orderDoc => {
      const order = orderDoc.data();
      const id = orderDoc.id;

      const card = document.createElement("article");
      card.className = "order-card";

      const statusOptions = ["New", "In progress", "Review", "Completed", "Cancelled"];
      const statusSelect = isAdmin
        ? `<select class="status-select" data-id="${safeText(id)}">
            ${statusOptions.map(status =>
              `<option value="${safeText(status)}" ${order.status === status ? "selected" : ""}>${safeText(status)}</option>`
            ).join("")}
          </select>`
        : `<span class="status">${safeText(order.status || "New")}</span>`;

      const references = (order.referenceUrls || []).map((url, index) =>
        `<a href="${safeText(url)}" target="_blank" rel="noopener">Reference ${index + 1}</a>`
      ).join(" · ");

      card.innerHTML = `
        <div class="order-top">
          <div>
            <h4>${safeText(order.service || t("project"))}</h4>
            <p>${isAdmin ? "Client: " + safeText(order.username || "Client") + " · " : ""}${safeText(order.style || "")}</p>
          </div>
          ${statusSelect}
        </div>
        <p style="margin-top:10px">${safeText(order.description || "")}</p>
        ${references ? `<p style="margin-top:9px">${references}</p>` : ""}
        <button class="secondary open-chat" data-id="${safeText(id)}" style="margin-top:14px">${safeText(t("openChat"))} ↗</button>
      `;

      list.appendChild(card);
    });

    list.querySelectorAll(".open-chat").forEach(button => {
      button.addEventListener("click", () => openChat(button.dataset.id));
    });

    if (isAdmin) {
      list.querySelectorAll(".status-select").forEach(select => {
        select.addEventListener("change", async () => {
          try {
            await updateDoc(doc(db, "orders", select.dataset.id), {
              status: select.value,
              updatedAt: serverTimestamp()
            });
          } catch (error) {
            console.error(error);
            alert("Could not update status. Check your Firestore rules.");
          }
        });
      });
    }
  }, error => {
    console.error(error);
    $("orderList").innerHTML = `<div class="empty">Could not load orders. Check your Firestore rules.</div>`;
  });
}

/* -------------------------------------------------------
   ORDER CHAT
------------------------------------------------------- */

async function openChat(orderId) {
  activeOrderId = orderId;
  showModal("chatModal");
  $("chatMessages").innerHTML = `<div class="empty">Loading messages…</div>`;
  $("chatTitle").textContent = "Project conversation";
  $("adminDelivery").classList.toggle("hidden", !isAdmin);
  setMessage("chatMessage", "");

  if (stopMessages) stopMessages();

  const messagesRef = collection(db, "orders", orderId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));

  stopMessages = onSnapshot(q, snapshot => {
    const area = $("chatMessages");
    area.innerHTML = "";

    if (snapshot.empty) {
      area.innerHTML = `<div class="empty">${safeText(t("chatEmpty"))}</div>`;
      return;
    }

    snapshot.forEach(messageDoc => {
      const message = messageDoc.data();
      const bubble = document.createElement("div");
      bubble.className = "bubble" + (message.uid === currentUser.uid ? " mine" : "");

      bubble.innerHTML = `
        ${safeText(message.text || "")}
        ${message.fileUrl ? `<br><a href="${safeText(message.fileUrl)}" target="_blank" rel="noopener">${safeText(message.fileName || "Open artwork")}</a>` : ""}
        <small>${safeText(message.username || "User")}</small>
      `;

      area.appendChild(bubble);
    });

    area.scrollTop = area.scrollHeight;
  }, error => {
    console.error(error);
    setMessage("chatMessage", "Unable to load conversation. Check your rules.");
  });
}

$("chatForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!activeOrderId || !currentUser) return;

  const text = $("chatInput").value.trim();
  if (!text) return;

  try {
    await addDoc(collection(db, "orders", activeOrderId, "messages"), {
      uid: currentUser.uid,
      username: currentUser.displayName,
      text,
      createdAt: serverTimestamp()
    });

    $("chatInput").value = "";
  } catch (error) {
    console.error(error);
    setMessage("chatMessage", t("messageError"));
  }
});

$("deliverBtn").addEventListener("click", async () => {
  if (!isAdmin || !activeOrderId) return;

  const file = $("deliveryFile").files[0];
  if (!file) return setMessage("chatMessage", t("chooseFile"));
  if (file.size > 5 * 1024 * 1024) return setMessage("chatMessage", t("fileTooLarge"));

  try {
    $("deliverBtn").disabled = true;

    const fileRef = ref(storage, `orders/${activeOrderId}/deliveries/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);

    await addDoc(collection(db, "orders", activeOrderId, "messages"), {
      uid: currentUser.uid,
      username: currentUser.displayName,
      text: t("delivered"),
      fileUrl: url,
      fileName: file.name,
      createdAt: serverTimestamp()
    });

    $("deliveryFile").value = "";
    setMessage("chatMessage", t("sent"), true);

    await updateDoc(doc(db, "orders", activeOrderId), {
      status: "Completed",
      updatedAt: serverTimestamp()
    });

  } catch (error) {
    console.error(error);
    setMessage("chatMessage", "Delivery failed. Check Firebase Storage rules.");
  } finally {
    $("deliverBtn").disabled = false;
  }
});

/* -------------------------------------------------------
   LANGUAGE + MODALS
------------------------------------------------------- */

$("language").addEventListener("change", event => setLanguage(event.target.value));
$("languageSettings").addEventListener("change", event => setLanguage(event.target.value));

document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", () => hideModal(button.dataset.close));
});

document.querySelectorAll(".modal-wrap").forEach(modal => {
  modal.addEventListener("click", event => {
    if (event.target === modal) modal.classList.remove("show");
  });
});

applyLanguage();
