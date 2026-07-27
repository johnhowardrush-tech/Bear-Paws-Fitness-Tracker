// Firebase Web App Configuration
// Get these values from Firebase Console > Project Settings > Your apps > Web
// See README.md for setup instructions

const firebaseConfig = {
  apiKey: "AIzaSyDr4t5WhNy_1W5XHfnMnSfSxbCYjFV2R7c",
  authDomain: "fitness-tracker-b6245.firebaseapp.com",
  projectId: "fitness-tracker-b6245",
  storageBucket: "fitness-tracker-b6245.firebasestorage.app",
  messagingSenderId: "547338569580",
  appId: "1:547338569580:web:daf48458271bd421e8d549",
  measurementId: "G-1R5RJWZQGW"
};

// Export for use in firebase-init.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = firebaseConfig;
}
