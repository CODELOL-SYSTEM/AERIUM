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
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  updateDoc,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* FIREBASE */

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

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const ADMIN_UID = "lZT1OcyUB3UkYGAK6C9vAKHKKD23";
const PAYPAL_URL = "https://paypal.com/paypalme/SH0PNOVA/";

let currentUser = null;
let currentUsername = "";
let authMode = "login";
let activeOrderId = null;
let activeOrderData = null;
let messageUnsubscribe = null;
let orderUnsubscribe = null;
let isAdmin = false;

/* HELPERS */

const $ = id => document.getElementById(id);

function showNotice(id, message, type = "error") {
  const element = $(id);
  if (!element) return;
  element.textContent = message;
  element.className = `notice show ${type}`;
}

function hideNotice(id) {
  const element = $(id);
  if (element) element.className = "notice";
}

function safeText(value) {
  return String(value ?? "");
}

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "Date non disponible";
  return timestamp.toDate().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function statusLabel(status) {
  const labels = {
    pending: "En attente",
    progress: "En création",
    review: "À valider",
    completed: "Terminée",
    cancelled: "Annulée"
  };
  return labels[status] || "En attente";
}

function usernameToEmail(username) {
  return `${username.toLowerCase()}@aerium-design.com`;
}

function validUsername(username) {
  return /^[a-zA-Z0-9_-]{3,24}$/.test(username);
}

function cleanListeners() {
  if (messageUnsubscribe) {
    messageUnsubscribe();
    messageUnsubscribe = null;
  }

  if (orderUnsubscribe) {
    orderUnsubscribe();
    orderUnsubscribe = null;
  }
}

function setPage(sectionId) {
  const sections = [
    "publicSite",
    "authSection",
    "orderSection",
    "customerSection",
    "adminSection"
  ];

  sections.forEach(id => $(id)?.classList.add("hidden"));
  $(sectionId)?.classList.remove("hidden");

  $("mainHeader").classList.toggle("hidden", sectionId !== "publicSite");
  $("mainFooter").classList.toggle("hidden", sectionId !== "publicSite");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

window.showApp = function(sectionId) {
  if (sectionId === "orderSection" && !currentUser) {
    setPage("authSection");
    showNotice("authNotice", "Connectez-vous pour créer une commande.", "error");
    return;
  }

  setPage(sectionId);
};

window.showHome = function() {
  cleanListeners();
  setPage("publicSite");
};

window.startOrder = function(service) {
  if (!currentUser) {
    setPage("authSection");
    showNotice("authNotice", "Connectez-vous ou créez un compte pour commander.", "error");
    return;
  }

  $("orderService").value = service;
  hideNotice("orderNotice");
  setPage("orderSection");
};

/* AUTHENTIFICATION */

function setAuthMode(mode) {
  authMode = mode;

  $("loginTab").classList.toggle("active", mode === "login");
  $("registerTab").classList.toggle("active", mode === "register");

  $("authSubmit").textContent =
    mode === "login" ? "Se connecter" : "Créer mon compte";

  $("authPassword").autocomplete =
    mode === "login" ? "current-password" : "new-password";

  hideNotice("authNotice");
}

$("loginTab").addEventListener("click", () => setAuthMode("login"));
$("registerTab").addEventListener("click", () => setAuthMode("register"));

$("authForm").addEventListener("submit", async event => {
  event.preventDefault();
  hideNotice("authNotice");

  const username = $("authUsername").value.trim();
  const password = $("authPassword").value;

  if (!validUsername(username)) {
    showNotice("authNotice", "Le pseudo doit contenir entre 3 et 24 caractères : lettres, chiffres, tirets ou underscores.");
    return;
  }

  if (password.length < 6) {
    showNotice("authNotice", "Le mot de passe doit contenir au moins 6 caractères.");
    return;
  }

  const email = usernameToEmail(username);
  $("authSubmit").disabled = true;

  try {
    if (authMode === "register") {
      if (username.toLowerCase() === "poe13") {
        throw new Error("Ce nom d'utilisateur n'est pas disponible.");
      }

      const usernameRef = doc(db, "usernames", username.toLowerCase());
      const existing = await getDoc(usernameRef);

      if (existing.exists()) {
        throw new Error("Ce nom d'utilisateur est déjà utilisé.");
      }

      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await setDoc(usernameRef, {
        uid: credential.user.uid,
        username: username,
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, "profiles", credential.user.uid), {
        uid: credential.user.uid,
        username: username,
        createdAt: serverTimestamp()
      });

    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }

  } catch (error) {
    console.error(error);

    let message = "Une erreur est survenue.";

    if (error.code === "auth/email-already-in-use") {
      message = "Ce nom d'utilisateur est déjà utilisé.";
    } else if (error.code === "auth/invalid-credential") {
      message = "Nom d'utilisateur ou mot de passe incorrect.";
    } else if (error.code === "auth/weak-password") {
      message = "Choisissez un mot de passe plus sécurisé.";
    } else if (error.code === "auth/too-many-requests") {
      message = "Trop de tentatives. Réessayez plus tard.";
    } else if (error.message) {
      message = error.message;
    }

    showNotice("authNotice", message);

  } finally {
    $("authSubmit").disabled = false;
  }
});

/* FICHIERS ET COMPRESSION */

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de lire cette image."));
    };

    image.src = url;
  });
}

async function imageToWebp(file, blurred = false) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Le fichier doit être une image.");
  }

  const image = await loadImage(file);
  const maxDimension = 1100;

  const scale = Math.min(
    1,
    maxDimension / Math.max(image.width, image.height)
  );

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d");

  if (blurred) {
    context.filter = "blur(18px)";
    context.drawImage(
      image,
      -12,
      -12,
      canvas.width + 24,
      canvas.height + 24
    );
    context.filter = "none";
  } else {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  }

  let quality = 0.72;
  let dataUrl = canvas.toDataURL("image/webp", quality);

  while (dataUrl.length > 650000 && quality > 0.25) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/webp", quality);
  }

  if (dataUrl.length > 700000) {
    throw new Error("Cette image est trop lourde. Choisissez une image plus petite.");
  }

  return dataUrl;
}

/* AFFICHAGE DES FICHIERS DE RÉFÉRENCE */

$("referenceFiles").addEventListener("change", () => {
  const files = [...$("referenceFiles").files];

  if (!files.length) {
    $("referencePreview").textContent = "Aucun fichier sélectionné.";
    return;
  }

  if (files.length > 3) {
    $("referenceFiles").value = "";
    $("referencePreview").textContent = "Maximum 3 images.";
    return;
  }

  $("referencePreview").textContent =
    files.map(file => `${file.name} (${Math.round(file.size / 1024)} Ko)`).join(" • ");
});

/* CRÉATION DE COMMANDE */

$("orderForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (!currentUser) {
    setPage("authSection");
    return;
  }

  hideNotice("orderNotice");

  const files = [...$("referenceFiles").files];

  if (files.length > 3) {
    showNotice("orderNotice", "Vous pouvez ajouter 3 images maximum.");
    return;
  }

  $("submitOrder").disabled = true;
  $("submitOrder").textContent = "Envoi en cours...";

  try {
    const orderRef = doc(collection(db, "orders"));

    await setDoc(orderRef, {
      uid: currentUser.uid,
      username: currentUsername,
      service: $("orderService").value,
      style: $("orderStyle").value,
      colors: $("orderColors").value.trim(),
      text: $("orderText").value.trim(),
      description: $("orderDescription").value.trim(),
      status: "pending",
      paymentReceived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    for (const file of files) {
      const dataUrl = await imageToWebp(file, false);

      await addDoc(collection(db, "orders", orderRef.id, "references"), {
        uid: currentUser.uid,
        name: file.name.slice(0, 100),
        mime: "image/webp",
        dataUrl,
        createdAt: serverTimestamp()
      });
    }

    $("orderForm").reset();
    $("referencePreview").textContent = "Aucun fichier sélectionné.";

    showNotice("orderNotice", "Votre demande a bien été envoyée.", "success");

    await loadCustomerOrders();
    setPage("customerSection");

  } catch (error) {
    console.error(error);
    showNotice("orderNotice", error.message || "Impossible d'envoyer votre commande.");
  } finally {
    $("submitOrder").disabled = false;
    $("submitOrder").textContent = "Envoyer ma demande";
  }
});

/* LISTE DES COMMANDES CLIENT */

async function loadCustomerOrders() {
  if (!currentUser) return;

  const container = $("customerOrders");
  container.innerHTML = `<div class="empty">Chargement de vos commandes...</div>`;

  try {
    const q = query(
      collection(db, "orders"),
      where("uid", "==", currentUser.uid)
    );

    const snapshot = await getDocs(q);

    const orders = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    orders.sort((a, b) => {
      const aDate = a.createdAt?.toMillis?.() || 0;
      const bDate = b.createdAt?.toMillis?.() || 0;
      return bDate - aDate;
    });

    if (!orders.length) {
      container.innerHTML = `<div class="empty">Vous n'avez pas encore de commande.</div>`;
      return;
    }

    container.innerHTML = "";

    orders.forEach(order => {
      const card = document.createElement("article");
      card.className = "order-card";

      const title = document.createElement("h3");
      title.textContent = order.service || "Commande";

      const description = document.createElement("p");
      description.textContent =
        `${statusLabel(order.status)} • ${formatDate(order.createdAt)}`;

      const style = document.createElement("p");
      style.textContent = `Style : ${order.style || "Non précisé"}`;

      const badge = document.createElement("span");
      badge.className = "status";
      badge.textContent = statusLabel(order.status);

      const actions = document.createElement("div");
      actions.className = "order-actions";

      const openButton = document.createElement("button");
      openButton.className = "btn btn-primary";
      openButton.textContent = "Ouvrir la discussion";
      openButton.addEventListener("click", () => openCustomerChat(order.id));

      actions.append(openButton);
      card.append(title, badge, description, style, actions);
      container.append(card);
    });

  } catch (error) {
    console.error(error);
    container.innerHTML = `<div class="empty">Impossible de charger vos commandes.</div>`;
  }
}

/* CHAT */

async function sendMessage(orderId, text) {
  const clean = text.trim();

  if (!clean || !currentUser || !orderId) return;

  if (clean.length > 1000) {
    throw new Error("Le message est trop long.");
  }

  await addDoc(collection(db, "orders", orderId, "messages"), {
    uid: currentUser.uid,
    username: currentUsername,
    text: clean,
    createdAt: serverTimestamp()
  });
}

function listenMessages(orderId, containerId) {
  if (messageUnsubscribe) messageUnsubscribe();

  const q = query(
    collection(db, "orders", orderId, "messages")
  );

  messageUnsubscribe = onSnapshot(q, snapshot => {
    const messages = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    messages.sort((a, b) => {
      const aDate = a.createdAt?.toMillis?.() || 0;
      const bDate = b.createdAt?.toMillis?.() || 0;
      return aDate - bDate;
    });

    const container = $(containerId);
    container.innerHTML = "";

    if (!messages.length) {
      container.innerHTML = `<div class="empty">Aucun message pour le moment.</div>`;
      return;
    }

    messages.forEach(message => {
      const item = document.createElement("div");
      item.className =
        "message" + (message.uid === currentUser.uid ? " mine" : "");

      const author = document.createElement("small");
      author.textContent = message.username || "Utilisateur";

      const content = document.createElement("p");
      content.textContent = message.text || "";

      item.append(author, content);
      container.append(item);
    });

    container.scrollTop = container.scrollHeight;
  }, error => {
    console.error(error);
    container.innerHTML = `<div class="empty">Impossible de charger les messages.</div>`;
  });
}

$("customerMessageForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!activeOrderId) return;

  const input = $("customerMessageInput");
  const value = input.value;

  try {
    await sendMessage(activeOrderId, value);
    input.value = "";
    hideNotice("customerNotice");
  } catch (error) {
    showNotice("customerNotice", error.message || "Impossible d'envoyer le message.");
  }
});

$("adminMessageForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!activeOrderId || !isAdmin) return;

  const input = $("adminMessageInput");

  try {
    await sendMessage(activeOrderId, input.value);
    input.value = "";
    hideNotice("adminNotice");
  } catch (error) {
    showNotice("adminNotice", error.message || "Impossible d'envoyer le message.");
  }
});

/* CLIENT : APERÇUS ET LIVRAISONS */

function createArtworkCard(name, dataUrl, isLocked, deliveryId = "") {
  const card = document.createElement("div");
  card.className = "artwork-card";

  const image = document.createElement("img");
  image.src = dataUrl;
  image.alt = isLocked ? "Aperçu flouté" : name;

  const title = document.createElement("p");
  title.textContent = name;

  card.append(image, title);

  if (isLocked) {
    const link = document.createElement("a");
    link.href = PAYPAL_URL;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "btn btn-primary";
    link.textContent = "Débloquer avec PayPal";

    const note = document.createElement("div");
    note.className = "payment-note";
    note.textContent = "Après votre paiement, le studio vérifiera la réception et débloquera votre image.";

    card.append(link, note);
  } else {
    const download = document.createElement("a");
    download.href = dataUrl;
    download.download = name || "creation-aerium.webp";
    download.className = "btn btn-primary";
    download.textContent = "Télécharger l'image";
    card.append(download);
  }

  return card;
}

async function loadCustomerArtwork(orderId, paid) {
  const container = $("customerFiles");
  container.innerHTML = `<div class="empty">Chargement des créations...</div>`;

  try {
    const previewsSnap = await getDocs(
      collection(db, "orders", orderId, "previews")
    );

    container.innerHTML = "";

    for (const item of previewsSnap.docs) {
      const preview = item.data();

      if (!preview.dataUrl) continue;

      if (paid) {
        const deliveryRef = doc(
          db,
          "orders",
          orderId,
          "deliveries",
          preview.deliveryId
        );

        const deliverySnap = await getDoc(deliveryRef);

        if (deliverySnap.exists()) {
          const delivery = deliverySnap.data();
          container.append(
            createArtworkCard(
              delivery.name || preview.name || "Création",
              delivery.dataUrl,
              false
            )
          );
        }
      } else {
        container.append(
          createArtworkCard(
            preview.name || "Aperçu de votre création",
            preview.dataUrl,
            true,
            preview.deliveryId
          )
        );
      }
    }

    if (!container.children.length) {
      container.innerHTML = `<div class="empty">Aucune création envoyée pour le moment.</div>`;
    }

  } catch (error) {
    console.error(error);
    container.innerHTML = `<div class="empty">Impossible de charger les créations.</div>`;
  }
}

async function openCustomerChat(orderId) {
  cleanListeners();

  activeOrderId = orderId;

  try {
    const orderSnap = await getDoc(doc(db, "orders", orderId));

    if (!orderSnap.exists()) {
      throw new Error("Cette commande n'existe plus.");
    }

    const order = orderSnap.data();

    if (order.uid !== currentUser.uid) {
      throw new Error("Vous n'avez pas accès à cette commande.");
    }

    activeOrderData = order;

    $("customerChatTitle").textContent = `Discussion : ${order.service}`;
    $("customerChatPanel").classList.remove("hidden");

    listenMessages(orderId, "customerMessages");
    await loadCustomerArtwork(orderId, order.paymentReceived === true);

    $("customerChatPanel").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {
    console.error(error);
    alert(error.message || "Impossible d'ouvrir cette discussion.");
  }
}

$("closeCustomerChat").addEventListener("click", () => {
  cleanListeners();
  activeOrderId = null;
  $("customerChatPanel").classList.add("hidden");
});

/* ADMIN : LISTE DES COMMANDES */

async function loadAdminOrders() {
  if (!isAdmin) return;

  const container = $("adminOrders");
  container.innerHTML = `<div class="empty">Chargement des commandes...</div>`;

  try {
    const snapshot = await getDocs(collection(db, "orders"));

    const orders = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    orders.sort((a, b) => {
      const aDate = a.createdAt?.toMillis?.() || 0;
      const bDate = b.createdAt?.toMillis?.() || 0;
      return bDate - aDate;
    });

    container.innerHTML = "";

    if (!orders.length) {
      container.innerHTML = `<div class="empty">Aucune commande reçue.</div>`;
      return;
    }

    orders.forEach(order => {
      const card = document.createElement("div");
      card.className = "admin-order";

      const info = document.createElement("div");

      const title = document.createElement("h3");
      title.textContent = `${order.service || "Commande"} • ${order.username || "Client"}`;

      const description = document.createElement("p");
      description.textContent =
        `${statusLabel(order.status)} • ${formatDate(order.createdAt)} • ${order.paymentReceived ? "Payé" : "Non payé"}`;

      info.append(title, description);

      const button = document.createElement("button");
      button.className = "btn btn-primary";
      button.textContent = "Ouvrir";
      button.addEventListener("click", () => openAdminChat(order.id));

      card.append(info, button);
      container.append(card);
    });

  } catch (error) {
    console.error(error);
    container.innerHTML = `<div class="empty">Impossible de charger les commandes. Vérifiez les règles Firestore.</div>`;
  }
}

/* ADMIN : FICHIERS */

async function loadAdminArtwork(orderId) {
  const container = $("adminFiles");
  container.innerHTML = `<div class="empty">Chargement...</div>`;

  try {
    const [referencesSnap, previewsSnap, deliveriesSnap] = await Promise.all([
      getDocs(collection(db, "orders", orderId, "references")),
      getDocs(collection(db, "orders", orderId, "previews")),
      getDocs(collection(db, "orders", orderId, "deliveries"))
    ]);

    container.innerHTML = "";

    referencesSnap.forEach(item => {
      const file = item.data();
      if (file.dataUrl) {
        container.append(
          createArtworkCard(
            `Référence : ${file.name || "Image"}`,
            file.dataUrl,
            false
          )
        );
      }
    });

    previewsSnap.forEach(item => {
      const file = item.data();
      if (file.dataUrl) {
        container.append(
          createArtworkCard(
            `Aperçu : ${file.name || "Image"}`,
            file.dataUrl,
            false
          )
        );
      }
    });

    deliveriesSnap.forEach(item => {
      const file = item.data();
      if (file.dataUrl) {
        container.append(
          createArtworkCard(
            `Original : ${file.name || "Image"}`,
            file.dataUrl,
            false
          )
        );
      }
    });

    if (!container.children.length) {
      container.innerHTML = `<div class="empty">Aucun fichier pour cette commande.</div>`;
    }

  } catch (error) {
    console.error(error);
    container.innerHTML = `<div class="empty">Impossible de charger les fichiers.</div>`;
  }
}

/* ADMIN : OUVERTURE DU CHAT */

async function openAdminChat(orderId) {
  if (!isAdmin) return;

  cleanListeners();

  activeOrderId = orderId;

  try {
    const snap = await getDoc(doc(db, "orders", orderId));

    if (!snap.exists()) {
      throw new Error("Commande introuvable.");
    }

    const order = snap.data();
    activeOrderData = order;

    $("adminChatTitle").textContent =
      `${order.service || "Commande"} • ${order.username || "Client"}`;

    $("adminStatus").value = order.status || "pending";

    $("sendDelivery").textContent =
      order.service === "Photo de profil"
        ? "Envoyer la photo de profil"
        : order.service === "Miniature YouTube"
          ? "Envoyer la miniature"
          : "Envoyer la création";

    $("paymentAdminState").textContent =
      order.paymentReceived
        ? "Paiement confirmé. L'image originale est débloquée."
        : "Paiement non confirmé. L'image originale est verrouillée.";

    $("markPaymentReceived").disabled = order.paymentReceived === true;
    $("markPaymentReceived").textContent =
      order.paymentReceived ? "Paiement déjà confirmé" : "Paiement reçu : débloquer l'image";

    $("adminChatPanel").classList.remove("hidden");

    listenMessages(orderId, "adminMessages");
    await loadAdminArtwork(orderId);

    $("adminChatPanel").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {
    console.error(error);
    alert(error.message || "Impossible d'ouvrir cette commande.");
  }
}

$("closeAdminChat").addEventListener("click", () => {
  cleanListeners();
  activeOrderId = null;
  activeOrderData = null;
  $("adminChatPanel").classList.add("hidden");
});

/* ADMIN : ENVOI DE LA CRÉATION */

$("sendDelivery").addEventListener("click", async () => {
  if (!isAdmin || !activeOrderId) return;

  hideNotice("adminNotice");

  const file = $("deliveryFiles").files[0];

  if (!file) {
    showNotice("adminNotice", "Choisissez d'abord une image.");
    return;
  }

  $("sendDelivery").disabled = true;
  $("sendDelivery").textContent = "Préparation de l'image...";

  try {
    const originalDataUrl = await imageToWebp(file, false);
    const blurredDataUrl = await imageToWebp(file, true);

    const deliveryRef = doc(
      collection(db, "orders", activeOrderId, "deliveries")
    );

    await setDoc(deliveryRef, {
      uid: currentUser.uid,
      name: file.name.slice(0, 100),
      mime: "image/webp",
      dataUrl: originalDataUrl,
      createdAt: serverTimestamp()
    });

    await addDoc(
      collection(db, "orders", activeOrderId, "previews"),
      {
        uid: currentUser.uid,
        name: file.name.slice(0, 100),
        service: activeOrderData?.service || "Création",
        deliveryId: deliveryRef.id,
        mime: "image/webp",
        dataUrl: blurredDataUrl,
        createdAt: serverTimestamp()
      }
    );

    $("deliveryFiles").value = "";

    showNotice("adminNotice", "Aperçu envoyé au client. L'original reste verrouillé.", "success");

    await loadAdminArtwork(activeOrderId);

  } catch (error) {
    console.error(error);
    showNotice("adminNotice", error.message || "Impossible d'envoyer cette image.");
  } finally {
    $("sendDelivery").disabled = false;

    const service = activeOrderData?.service;

    $("sendDelivery").textContent =
      service === "Photo de profil"
        ? "Envoyer la photo de profil"
        : service === "Miniature YouTube"
          ? "Envoyer la miniature"
          : "Envoyer la création";
  }
});

/* ADMIN : STATUT */

$("saveStatus").addEventListener("click", async () => {
  if (!isAdmin || !activeOrderId) return;

  try {
    await updateDoc(doc(db, "orders", activeOrderId), {
      status: $("adminStatus").value,
      updatedAt: serverTimestamp()
    });

    activeOrderData.status = $("adminStatus").value;
    showNotice("adminNotice", "Statut mis à jour.", "success");
    await loadAdminOrders();

  } catch (error) {
    console.error(error);
    showNotice("adminNotice", "Impossible de modifier le statut.");
  }
});

/* ADMIN : CONFIRMATION DU PAIEMENT */

$("markPaymentReceived").addEventListener("click", async () => {
  if (!isAdmin || !activeOrderId || !activeOrderData) return;

  if (activeOrderData.paymentReceived === true) {
    showNotice("adminNotice", "Ce paiement est déjà confirmé.", "success");
    return;
  }

  const confirmed = confirm(
    "As-tu vérifié dans PayPal que le paiement a bien été reçu ?"
  );

  if (!confirmed) return;

  try {
    await updateDoc(doc(db, "orders", activeOrderId), {
      paymentReceived: true,
      paymentConfirmedAt: serverTimestamp(),
      paymentConfirmedBy: currentUser.uid,
      updatedAt: serverTimestamp()
    });

    activeOrderData.paymentReceived = true;

    $("paymentAdminState").textContent =
      "Paiement confirmé. L'image originale est débloquée.";

    $("markPaymentReceived").disabled = true;
    $("markPaymentReceived").textContent = "Paiement déjà confirmé";

    showNotice("adminNotice", "Paiement confirmé. Le client peut maintenant télécharger l'image.", "success");

    await loadAdminArtwork(activeOrderId);
    await loadAdminOrders();

  } catch (error) {
    console.error(error);
    showNotice("adminNotice", "Impossible de confirmer le paiement.");
  }
});

/* DÉCONNEXION */

$("customerLogout").addEventListener("click", async () => {
  cleanListeners();
  await signOut(auth);
});

$("adminLogout").addEventListener("click", async () => {
  cleanListeners();
  await signOut(auth);
});

/* SESSION */

onAuthStateChanged(auth, async user => {
  currentUser = user;
  currentUsername = "";
  isAdmin = false;
  activeOrderId = null;
  activeOrderData = null;
  cleanListeners();

  if (!user) {
    setPage("publicSite");
    return;
  }

  isAdmin = user.uid === ADMIN_UID;

  if (isAdmin) {
    currentUsername = "POE13";
    $("customerName").textContent = currentUsername;
    setPage("adminSection");
    await loadAdminOrders();
    return;
  }

  try {
    const profileSnap = await getDoc(doc(db, "profiles", user.uid));

    if (profileSnap.exists()) {
      currentUsername = profileSnap.data().username || "Client";
    } else {
      currentUsername = user.email?.split("@")[0] || "Client";
    }

    $("customerName").textContent = currentUsername;

    setPage("customerSection");
    await loadCustomerOrders();

  } catch (error) {
    console.error(error);
    setPage("publicSite");
  }
});

/* ANIMATIONS D'APPARITION */

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.12
});

document.querySelectorAll(".reveal").forEach(element => {
  revealObserver.observe(element);
});
