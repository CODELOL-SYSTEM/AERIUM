rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return signedIn()
        && request.auth.uid == "lZT1OcyUB3UkYGAK6C9vAKHKKD23";
    }

    function ownsOrder(orderId) {
      return signedIn()
        && exists(/databases/$(database)/documents/orders/$(orderId))
        && get(/databases/$(database)/documents/orders/$(orderId)).data.uid
          == request.auth.uid;
    }

    function paymentReceived(orderId) {
      return get(/databases/$(database)/documents/orders/$(orderId)).data.paymentReceived
        == true;
    }

    function canAccessOrder(orderId) {
      return isAdmin() || ownsOrder(orderId);
    }

    match /usernames/{username} {
      allow get: if true;
      allow list: if false;

      allow create: if signedIn()
        && request.resource.data.keys().hasAll(["uid", "username"])
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.username is string
        && request.resource.data.username == username
        && username != "poe13";

      allow update, delete: if false;
    }

    match /profiles/{userId} {
      allow read: if signedIn()
        && (request.auth.uid == userId || isAdmin());

      allow create: if signedIn()
        && request.auth.uid == userId
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.username is string;

      allow update: if signedIn()
        && request.auth.uid == userId
        && request.resource.data.uid == resource.data.uid;

      allow delete: if false;
    }

    match /orders/{orderId} {

      allow create: if signedIn()
        && request.resource.data.keys().hasAll([
          "uid",
          "username",
          "service",
          "style",
          "colors",
          "text",
          "description",
          "status",
          "paymentReceived",
          "createdAt",
          "updatedAt"
        ])
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.username is string
        && request.resource.data.service is string
        && request.resource.data.style is string
        && request.resource.data.colors is string
        && request.resource.data.text is string
        && request.resource.data.description is string
        && request.resource.data.status == "pending"
        && request.resource.data.paymentReceived == false
        && request.resource.data.createdAt == request.time
        && request.resource.data.updatedAt == request.time;

      allow read: if signedIn()
        && (resource.data.uid == request.auth.uid || isAdmin());

      allow update: if isAdmin()
        && request.resource.data.diff(resource.data)
          .affectedKeys()
          .hasOnly([
            "status",
            "paymentReceived",
            "paymentConfirmedAt",
            "paymentConfirmedBy",
            "updatedAt"
          ])
        && request.resource.data.status in [
          "pending",
          "progress",
          "review",
          "completed",
          "cancelled"
        ]
        && request.resource.data.updatedAt == request.time
        && (
          (
            request.resource.data.paymentReceived == false
            && resource.data.paymentReceived == false
          )
          ||
          (
            request.resource.data.paymentReceived == true
            && resource.data.paymentReceived == false
            && request.resource.data.paymentConfirmedAt == request.time
            && request.resource.data.paymentConfirmedBy == request.auth.uid
          )
          ||
          (
            request.resource.data.paymentReceived == true
            && resource.data.paymentReceived == true
          )
        );

      allow delete: if isAdmin();

      /* CHAT */

      match /messages/{messageId} {
        allow read: if canAccessOrder(orderId);

        allow create: if canAccessOrder(orderId)
          && request.resource.data.keys().hasAll([
            "uid",
            "username",
            "text",
            "createdAt"
          ])
          && request.resource.data.uid == request.auth.uid
          && request.resource.data.username is string
          && request.resource.data.text is string
          && request.resource.data.createdAt == request.time;

        allow update, delete: if false;
      }

      /* IMAGES DE RÉFÉRENCE */

      match /references/{fileId} {
        allow read: if canAccessOrder(orderId);

        allow create: if ownsOrder(orderId)
          && request.resource.data.keys().hasAll([
            "uid",
            "name",
            "mime",
            "dataUrl",
            "createdAt"
          ])
          && request.resource.data.uid == request.auth.uid
          && request.resource.data.name is string
          && request.resource.data.mime == "image/webp"
          && request.resource.data.dataUrl is string
          && request.resource.data.createdAt == request.time;

        allow update, delete: if false;
      }

      /* APERÇUS FLOUTÉS */

      match /previews/{previewId} {
        allow read: if canAccessOrder(orderId);

        allow create: if isAdmin()
          && request.resource.data.keys().hasAll([
            "uid",
            "name",
            "service",
            "deliveryId",
            "mime",
            "dataUrl",
            "createdAt"
          ])
          && request.resource.data.uid == request.auth.uid
          && request.resource.data.name is string
          && request.resource.data.service is string
          && request.resource.data.deliveryId is string
          && request.resource.data.mime == "image/webp"
          && request.resource.data.dataUrl is string
          && request.resource.data.createdAt == request.time;

        allow update, delete: if false;
      }

      /* IMAGES ORIGINALES */

      match /deliveries/{deliveryId} {
        allow read: if isAdmin()
          || (ownsOrder(orderId) && paymentReceived(orderId));

        allow create: if isAdmin()
          && request.resource.data.keys().hasAll([
            "uid",
            "name",
            "mime",
            "dataUrl",
            "createdAt"
          ])
          && request.resource.data.uid == request.auth.uid
          && request.resource.data.name is string
          && request.resource.data.mime == "image/webp"
          && request.resource.data.dataUrl is string
          && request.resource.data.createdAt == request.time;

        allow update, delete: if false;
      }
    }
  }
}
