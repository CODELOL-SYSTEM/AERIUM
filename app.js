
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

let customerSelectedImage = null;
let adminSelectedImage = null;

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

  sections.forEach(id => {
    $(id)?.classList.add("hidden");
  });

  $(sectionId)?.classList.remove("hidden");

  $("mainHeader")?.classList.toggle(
    "hidden",
    sectionId !== "publicSite"
  );

  $("mainFooter")?.classList.toggle(
    "hidden",
    sectionId !== "publicSite"
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

window.showApp = function(sectionId) {
  if (sectionId === "orderSection" && !currentUser) {
    setPage("authSection");
    showNotice(
      "authNotice",
      "Connectez-vous pour créer une commande.",
      "error"
    );
    return;
  }

  setPage(sectionId);
};

window.showHome = function() {
  cleanListeners();
  activeOrderId = null;
  activeOrderData = null;
  setPage("publicSite");
};

window.startOrder = function(service) {
  if (!currentUser) {
    setPage("authSection");

    showNotice(
      "authNotice",
      "Connectez-vous ou créez un compte pour commander.",
      "error"
    );

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
    mode === "login"
      ? "Se connecter"
      : "Créer mon compte";

  $("authPassword").autocomplete =
    mode === "login"
      ? "current-password"
      : "new-password";

  hideNotice("authNotice");
}

$("loginTab").addEventListener("click", () => {
  setAuthMode("login");
});

$("registerTab").addEventListener("click", () => {
  setAuthMode("register");
});

$("authForm").addEventListener("submit", async event => {
  event.preventDefault();
  hideNotice("authNotice");

  const username = $("authUsername").value.trim();
  const password = $("authPassword").value;

  if (!validUsername(username)) {
    showNotice(
      "authNotice",
      "Le pseudo doit contenir entre 3 et 24 caractères : lettres, chiffres, tirets ou underscores."
    );
    return;
  }

  if (password.length < 6) {
    showNotice(
      "authNotice",
      "Le mot de passe doit contenir au moins 6 caractères."
    );
    return;
  }

  const email = usernameToEmail(username);
  $("authSubmit").disabled = true;

  try {
    if (authMode === "register") {
      if (username.toLowerCase() === "poe13") {
        throw new Error("Ce nom d'utilisateur n'est pas disponible.");
      }

      const usernameRef = doc(
        db,
        "usernames",
        username.toLowerCase()
      );

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
        username,
        createdAt: serverTimestamp()
      });

      await setDoc(
        doc(db, "profiles", credential.user.uid),
        {
          uid: credential.user.uid,
          username,
          createdAt: serverTimestamp()
        }
      );

    } else {
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
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

/* IMAGES ET COMPRESSION */

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

async function imageToWebp(
  file,
  blurred = false,
  maxCharacters = 650000
) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Le fichier doit être une image.");
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Format accepté : JPG, PNG ou WEBP.");
  }

  const image = await loadImage(file);
  const maxDimension = 1100;

  const scale = Math.min(
    1,
    maxDimension / Math.max(image.width, image.height)
  );

  const canvas = document.createElement("canvas");

  canvas.width = Math.max(
    1,
    Math.round(image.width * scale)
  );

  canvas.height = Math.max(
    1,
    Math.round(image.height * scale)
  );

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
    context.drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height
    );
  }

  let quality = 0.72;
  let dataUrl = canvas.toDataURL("image/webp", quality);

  while (
    dataUrl.length > maxCharacters &&
    quality > 0.20
  ) {
    quality -= 0.08;

    dataUrl = canvas.toDataURL(
      "image/webp",
      quality
    );
  }

  if (dataUrl.length > maxCharacters) {
    throw new Error(
      "Cette image est trop lourde. Choisissez une image plus petite."
    );
  }

  return dataUrl;
}

/* SÉLECTION DES IMAGES DU CHAT */

function resetChatImage(type) {
  if (type === "customer") {
    customerSelectedImage = null;

    if ($("customerChatImage")) {
      $("customerChatImage").value = "";
    }

    if ($("customerImagePreview")) {
      $("customerImagePreview").innerHTML = "";
      $("customerImagePreview").classList.add("hidden");
    }

  } else {
    adminSelectedImage = null;

    if ($("adminChatImage")) {
      $("adminChatImage").value = "";
    }

    if ($("adminImagePreview")) {
      $("adminImagePreview").innerHTML = "";
      $("adminImagePreview").classList.add("hidden");
    }
  }
}

function showChatImagePreview(type, file) {
  const previewId =
    type === "customer"
      ? "customerImagePreview"
      : "adminImagePreview";

  const container = $(previewId);

  if (!container) return;

  container.innerHTML = "";

  const image = document.createElement("img");
  image.src = URL.createObjectURL(file);
  image.alt = "Image sélectionnée";

  image.onload = () => {
    URL.revokeObjectURL(image.src);
  };

  const name = document.createElement("span");
  name.textContent = file.name;

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "btn btn-secondary";
  remove.textContent = "Retirer";

  remove.addEventListener("click", () => {
    resetChatImage(type);
  });

  container.append(image, name, remove);
  container.classList.remove("hidden");
}

function setupChatImageInput(type) {
  const inputId =
    type === "customer"
      ? "customerChatImage"
      : "adminChatImage";

  const buttonId =
    type === "customer"
      ? "customerAttachButton"
      : "adminAttachButton";

  const input = $(inputId);
  const button = $(buttonId);

  if (!input || !button) return;

  button.addEventListener("click", () => {
    input.click();
  });

  input.addEventListener("change", () => {
    const file = input.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      resetChatImage(type);

      showNotice(
        type === "customer"
          ? "customerNotice"
          : "adminNotice",
        "Format accepté : JPG, PNG ou WEBP."
      );

      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      resetChatImage(type);

      showNotice(
        type === "customer"
          ? "customerNotice"
          : "adminNotice",
        "L'image ne doit pas dépasser 8 Mo."
      );

      return;
    }

    if (type === "customer") {
      customerSelectedImage = file;
    } else {
      adminSelectedImage = file;
    }

    hideNotice(
      type === "customer"
        ? "customerNotice"
        : "adminNotice"
    );

    showChatImagePreview(type, file);
  });
}

setupChatImageInput("customer");
setupChatImageInput("admin");

/* IMAGES DE RÉFÉRENCE */

$("referenceFiles").addEventListener("change", () => {
  const files = [...$("referenceFiles").files];

  if (!files.length) {
    $("referencePreview").textContent =
      "Aucun fichier sélectionné.";
    return;
  }

  if (files.length > 3) {
    $("referenceFiles").value = "";

    $("referencePreview").textContent =
      "Maximum 3 images.";

    return;
  }

  $("referencePreview").textContent = files
    .map(file =>
      `${file.name} (${Math.round(file.size / 1024)} Ko)`
    )
    .join(" • ");
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
    showNotice(
      "orderNotice",
      "Vous pouvez ajouter 3 images maximum."
    );
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
      const dataUrl = await imageToWebp(
        file,
        false,
        450000
      );

      await addDoc(
        collection(db, "orders", orderRef.id, "references"),
        {
          uid: currentUser.uid,
          name: file.name.slice(0, 100),
          mime: "image/webp",
          dataUrl,
          createdAt: serverTimestamp()
        }
      );
    }

    $("orderForm").reset();

    $("referencePreview").textContent =
      "Aucun fichier sélectionné.";

    showNotice(
      "orderNotice",
      "Votre demande a bien été envoyée.",
      "success"
    );

    await loadCustomerOrders();
    setPage("customerSection");

  } catch (error) {
    console.error(error);

    showNotice(
      "orderNotice",
      error.message || "Impossible d'envoyer votre commande."
    );

  } finally {
    $("submitOrder").disabled = false;
    $("submitOrder").textContent = "Envoyer ma demande";
  }
});

/* COMMANDES CLIENT */

async function loadCustomerOrders() {
  if (!currentUser) return;

  const container = $("customerOrders");

  container.innerHTML =
    `<div class="empty">Chargement de vos commandes...</div>`;

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
      container.innerHTML =
        `<div class="empty">Vous n'avez pas encore de commande.</div>`;

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
      style.textContent =
        `Style : ${order.style || "Non précisé"}`;

      const badge = document.createElement("span");
      badge.className = "status";
      badge.textContent = statusLabel(order.status);

      const actions = document.createElement("div");
      actions.className = "order-actions";

      const openButton = document.createElement("button");
      openButton.className = "btn btn-primary";
      openButton.textContent = "Ouvrir la discussion";

      openButton.addEventListener("click", () => {
        openCustomerChat(order.id);
      });

      actions.append(openButton);

      card.append(
        title,
        badge,
        description,
        style,
        actions
      );

      container.append(card);
    });

  } catch (error) {
    console.error(error);

    container.innerHTML =
      `<div class="empty">Impossible de charger vos commandes.</div>`;
  }
}

/* CHAT : ENVOI DE MESSAGE OU IMAGE */

async function sendMessage(orderId, text, imageFile = null) {
  const clean = text.trim();

  if (!currentUser || !orderId) {
    throw new Error("Aucune discussion ouverte.");
  }

  if (!clean && !imageFile) {
    throw new Error("Écrivez un message ou ajoutez une image.");
  }

  if (clean.length > 1000) {
    throw new Error("Le message est trop long.");
  }

  const messageData = {
    uid: currentUser.uid,
    username: currentUsername,
    text: clean,
    createdAt: serverTimestamp()
  };

  if (imageFile) {
    const imageDataUrl = await imageToWebp(
      imageFile,
      false,
      400000
    );

    messageData.imageDataUrl = imageDataUrl;
    messageData.imageName = imageFile.name.slice(0, 100);
    messageData.imageMime = "image/webp";
  }

  await addDoc(
    collection(db, "orders", orderId, "messages"),
    messageData
  );
}

/* CHAT : AFFICHAGE DES MESSAGES */

function listenMessages(orderId, containerId) {
  if (messageUnsubscribe) {
    messageUnsubscribe();
  }

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

    if (!container) return;

    container.innerHTML = "";

    if (!messages.length) {
      container.innerHTML =
        `<div class="empty">Aucun message pour le moment.</div>`;

      return;
    }

    messages.forEach(message => {
      const item = document.createElement("div");

      item.className =
        "message" +
        (message.uid === currentUser.uid ? " mine" : "");

      const author = document.createElement("small");
      author.textContent = message.username || "Utilisateur";

      item.append(author);

      if (message.text) {
        const content = document.createElement("p");
        content.textContent = message.text;
        item.append(content);
      }

      if (message.imageDataUrl) {
        const imageLink = document.createElement("a");

        imageLink.href = message.imageDataUrl;
        imageLink.target = "_blank";
        imageLink.rel = "noopener noreferrer";

        const image = document.createElement("img");

        image.src = message.imageDataUrl;
        image.alt = message.imageName || "Image envoyée";
        image.className = "message-image";
        image.loading = "lazy";

        imageLink.append(image);
        item.append(imageLink);

        if (message.imageName) {
          const imageName = document.createElement("small");
          imageName.textContent = message.imageName;
          item.append(imageName);
        }
      }

      container.append(item);
    });

    container.scrollTop = container.scrollHeight;

  }, error => {
    console.error(error);

    const container = $(containerId);

    if (container) {
      container.innerHTML =
        `<div class="empty">Impossible de charger les messages.</div>`;
    }
  });
}

/* CHAT CLIENT */

$("customerMessageForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (!activeOrderId) return;

  const input = $("customerMessageInput");
  const button = $("customerMessageForm").querySelector(
    'button[type="submit"]'
  );

  const value = input.value;
  const imageFile = customerSelectedImage;

  if (!value.trim() && !imageFile) {
    showNotice(
      "customerNotice",
      "Écrivez un message ou ajoutez une image."
    );
    return;
  }

  if (button) button.disabled = true;

  try {
    await sendMessage(
      activeOrderId,
      value,
      imageFile
    );

    input.value = "";
    resetChatImage("customer");
    hideNotice("customerNotice");

  } catch (error) {
    console.error(error);

    showNotice(
      "customerNotice",
      error.message || "Impossible d'envoyer le message."
    );

  } finally {
    if (button) button.disabled = false;
  }
});

/* CHAT ADMIN */

$("adminMessageForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (!activeOrderId || !isAdmin) return;

  const input = $("adminMessageInput");
  const button = $("adminMessageForm").querySelector(
    'button[type="submit"]'
  );

  const imageFile = adminSelectedImage;

  if (!input.value.trim() && !imageFile) {
    showNotice(
      "adminNotice",
      "Écrivez un message ou ajoutez une image."
    );
    return;
  }

  if (button) button.disabled = true;

  try {
    await sendMessage(
      activeOrderId,
      input.value,
      imageFile
    );

    input.value = "";
    resetChatImage("admin");
    hideNotice("adminNotice");

  } catch (error) {
    console.error(error);

    showNotice(
      "adminNotice",
      error.message || "Impossible d'envoyer le message."
    );

  } finally {
    if (button) button.disabled = false;
  }
});

/* CRÉATIONS CLIENT */

function createArtworkCard(name, dataUrl, isLocked) {
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

    note.textContent =
      "Après votre paiement, le studio vérifiera la réception et débloquera votre image.";

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

  container.innerHTML =
    `<div class="empty">Chargement des créations...</div>`;

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
            true
          )
        );
      }
    }

    if (!container.children.length) {
      container.innerHTML =
        `<div class="empty">Aucune création envoyée pour le moment.</div>`;
    }

  } catch (error) {
    console.error(error);

    container.innerHTML =
      `<div class="empty">Impossible de charger les créations.</div>`;
  }
}

/* OUVERTURE CHAT CLIENT */

async function openCustomerChat(orderId) {
  cleanListeners();

  activeOrderId = orderId;

  resetChatImage("customer");

  try {
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      throw new Error("Cette commande n'existe plus.");
    }

    const order = orderSnap.data();

    if (order.uid !== currentUser.uid) {
      throw new Error("Vous n'avez pas accès à cette commande.");
    }

    activeOrderData = order;

    $("customerChatTitle").textContent =
      `Discussion : ${order.service}`;

    $("customerChatPanel").classList.remove("hidden");

    listenMessages(orderId, "customerMessages");

    await loadCustomerArtwork(
      orderId,
      order.paymentReceived === true
    );

    orderUnsubscribe = onSnapshot(orderRef, async snapshot => {
      if (!snapshot.exists()) return;

      const updatedOrder = snapshot.data();

      const wasPaid =
        activeOrderData?.paymentReceived === true;

      activeOrderData = updatedOrder;

      if (
        !wasPaid &&
        updatedOrder.paymentReceived === true
      ) {
        await loadCustomerArtwork(orderId, true);
      }
    });

    $("customerChatPanel").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {
    console.error(error);

    alert(
      error.message || "Impossible d'ouvrir cette discussion."
    );
  }
}

$("closeCustomerChat").addEventListener("click", () => {
  cleanListeners();

  activeOrderId = null;
  activeOrderData = null;

  resetChatImage("customer");

  $("customerChatPanel").classList.add("hidden");
});

/* ADMIN : LISTE DES COMMANDES */

async function loadAdminOrders() {
  if (!isAdmin) return;

  const container = $("adminOrders");

  container.innerHTML =
    `<div class="empty">Chargement des commandes...</div>`;

  try {
    const snapshot = await getDocs(
      collection(db, "orders")
    );

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
      container.innerHTML =
        `<div class="empty">Aucune commande reçue.</div>`;

      return;
    }

    orders.forEach(order => {
      const card = document.createElement("div");
      card.className = "admin-order";

      const info = document.createElement("div");

      const title = document.createElement("h3");

      title.textContent =
        `${order.service || "Commande"} • ${order.username || "Client"}`;

      const description = document.createElement("p");

      description.textContent =
        `${statusLabel(order.status)} • ${formatDate(order.createdAt)} • ${order.paymentReceived ? "Payé" : "Non payé"}`;

      info.append(title, description);

      const button = document.createElement("button");

      button.className = "btn btn-primary";
      button.textContent = "Ouvrir";

      button.addEventListener("click", () => {
        openAdminChat(order.id);
      });

      card.append(info, button);
      container.append(card);
    });

  } catch (error) {
    console.error(error);

    container.innerHTML =
      `<div class="empty">Impossible de charger les commandes. Vérifiez les règles Firestore.</div>`;
  }
}

/* ADMIN : FICHIERS */

async function loadAdminArtwork(orderId) {
  const container = $("adminFiles");

  container.innerHTML =
    `<div class="empty">Chargement...</div>`;

  try {
    const [
      referencesSnap,
      previewsSnap,
      deliveriesSnap
    ] = await Promise.all([
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
      container.innerHTML =
        `<div class="empty">Aucun fichier pour cette commande.</div>`;
    }

  } catch (error) {
    console.error(error);

    container.innerHTML =
      `<div class="empty">Impossible de charger les fichiers.</div>`;
  }
}

/* ADMIN : OUVERTURE DU CHAT */

async function openAdminChat(orderId) {
  if (!isAdmin) return;

  cleanListeners();

  activeOrderId = orderId;

  resetChatImage("admin");

  try {
    const orderRef = doc(db, "orders", orderId);
    const snap = await getDoc(orderRef);

    if (!snap.exists()) {
      throw new Error("Commande introuvable.");
    }

    const order = snap.data();

    activeOrderData = order;

    $("adminChatTitle").textContent =
      `${order.service || "Commande"} • ${order.username || "Client"}`;

    $("adminStatus").value =
      order.status || "pending";

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

    $("markPaymentReceived").disabled =
      order.paymentReceived === true;

    $("markPaymentReceived").textContent =
      order.paymentReceived
        ? "Paiement déjà confirmé"
        : "Paiement reçu : débloquer l'image";

    $("adminChatPanel").classList.remove("hidden");

    listenMessages(orderId, "adminMessages");

    await loadAdminArtwork(orderId);

    orderUnsubscribe = onSnapshot(orderRef, snapshot => {
      if (!snapshot.exists()) return;

      activeOrderData = snapshot.data();

      $("adminStatus").value =
        activeOrderData.status || "pending";

      $("paymentAdminState").textContent =
        activeOrderData.paymentReceived
          ? "Paiement confirmé. L'image originale est débloquée."
          : "Paiement non confirmé. L'image originale est verrouillée.";

      $("markPaymentReceived").disabled =
        activeOrderData.paymentReceived === true;

      $("markPaymentReceived").textContent =
        activeOrderData.paymentReceived
          ? "Paiement déjà confirmé"
          : "Paiement reçu : débloquer l'image";
    });

    $("adminChatPanel").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {
    console.error(error);

    alert(
      error.message || "Impossible d'ouvrir cette commande."
    );
  }
}

$("closeAdminChat").addEventListener("click", () => {
  cleanListeners();

  activeOrderId = null;
  activeOrderData = null;

  resetChatImage("admin");

  $("adminChatPanel").classList.add("hidden");
});

/* ADMIN : ENVOI DE LA CRÉATION */

$("sendDelivery").addEventListener("click", async () => {
  if (!isAdmin || !activeOrderId) return;

  hideNotice("adminNotice");

  const file = $("deliveryFiles").files[0];

  if (!file) {
    showNotice(
      "adminNotice",
      "Choisissez d'abord une image."
    );

    return;
  }

  $("sendDelivery").disabled = true;
  $("sendDelivery").textContent =
    "Préparation de l'image...";

  try {
    const originalDataUrl = await imageToWebp(
      file,
      false,
      450000
    );

    const blurredDataUrl = await imageToWebp(
      file,
      true,
      450000
    );

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

    showNotice(
      "adminNotice",
      "Aperçu envoyé au client. L'original reste verrouillé.",
      "success"
    );

    await loadAdminArtwork(activeOrderId);

  } catch (error) {
    console.error(error);

    showNotice(
      "adminNotice",
      error.message || "Impossible d'envoyer cette image."
    );

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
    await updateDoc(
      doc(db, "orders", activeOrderId),
      {
        status: $("adminStatus").value,
        updatedAt: serverTimestamp()
      }
    );

    activeOrderData.status =
      $("adminStatus").value;

    showNotice(
      "adminNotice",
      "Statut mis à jour.",
      "success"
    );

    await loadAdminOrders();

  } catch (error) {
    console.error(error);

    showNotice(
      "adminNotice",
      "Impossible de modifier le statut."
    );
  }
});

/* ADMIN : CONFIRMATION DU PAIEMENT */

$("markPaymentReceived").addEventListener("click", async () => {
  if (!isAdmin || !activeOrderId || !activeOrderData) {
    return;
  }

  if (activeOrderData.paymentReceived === true) {
    showNotice(
      "adminNotice",
      "Ce paiement est déjà confirmé.",
      "success"
    );

    return;
  }

  const confirmed = confirm(
    "As-tu vérifié que le paiement a bien été reçu ?"
  );

  if (!confirmed) return;

  try {
    await updateDoc(
      doc(db, "orders", activeOrderId),
      {
        paymentReceived: true,
        paymentConfirmedAt: serverTimestamp(),
        paymentConfirmedBy: currentUser.uid,
        updatedAt: serverTimestamp()
      }
    );

    activeOrderData.paymentReceived = true;

    $("paymentAdminState").textContent =
      "Paiement confirmé. L'image originale est débloquée.";

    $("markPaymentReceived").disabled = true;

    $("markPaymentReceived").textContent =
      "Paiement déjà confirmé";

    showNotice(
      "adminNotice",
      "Paiement confirmé. Le client peut maintenant télécharger l'image.",
      "success"
    );

    await loadAdminArtwork(activeOrderId);
    await loadAdminOrders();

  } catch (error) {
    console.error(error);

    showNotice(
      "adminNotice",
      "Impossible de confirmer le paiement."
    );
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

    $("customerName").textContent =
      currentUsername;

    setPage("adminSection");

    await loadAdminOrders();
    return;
  }

  try {
    const profileSnap = await getDoc(
      doc(db, "profiles", user.uid)
    );

    if (profileSnap.exists()) {
      currentUsername =
        profileSnap.data().username || "Client";
    } else {
      currentUsername =
        user.email?.split("@")[0] || "Client";
    }

    $("customerName").textContent =
      currentUsername;

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
